# Configurar OpenPix / Woovi para o Beco da Praia

Passo a passo para gerar AppID, cadastrar o webhook e deixar o backend pronto para o deploy na AWS.

Documentacao oficial: [OpenPix Developers](https://developers.openpix.com.br/).

## O que o backend espera

| Variavel / parametro SAM | Uso |
| --- | --- |
| `OPENPIX_BASE_URL` | API de cobrancas. Producao: `https://api.openpix.com.br`. Sandbox: `https://api.woovi-sandbox.com`. |
| `OPENPIX_APP_ID` | AppID da aplicacao OpenPix. Vai no header `Authorization` ao criar cobrancas Pix. |
| `OPENPIX_WEBHOOK_TOKEN` | Segredo compartilhado. A OpenPix deve enviar o mesmo valor no header `Authorization` do webhook. |
| `PIX_CHARGE_EXPIRES_IN_SECONDS` | Validade da cobranca (padrao `900` = 15 min). |

Endpoint do backend:

```text
POST /payments/openpix/webhook
```

Eventos tratados:

- `OPENPIX:CHARGE_COMPLETED` — marca pedido como pago e libera impressao
- `OPENPIX:CHARGE_EXPIRED` — marca pedido como expirado
- `teste_webhook` — resposta de OK no teste da plataforma OpenPix

## 1. Gerar o AppID

Precisa estar logado como **ADMIN**.

1. Acesse a conta OpenPix/Woovi.
2. No menu lateral, abra **API/Plugins**.
3. Clique em **Nova API/Plugin**.
4. Preencha assim:

| Campo | O que escolher | Por que |
| --- | --- | --- |
| Nome | `Beco da Praia Backend` | So para identificar no painel |
| Tipo | **API** | Backend/servidor (Lambda). **Nao** use Plugin nem Oracle |
| Escopo da aplicacao | Marque pelo menos cobrancas: `CHARGE_POST` e `CHARGE_GET` | O backend cria e consulta cobrancas Pix |

### O que cada tipo significa

- **API** (escolha esta): integracao server-to-server. E o caso do nosso backend Quarkus/Lambda.
- **Plugin**: so para Plugin JS / ecommerce no frontend. Nao serve para o backend.
- **Oracle**: so para Oracle Commerce Cloud. Ignore.

### Sobre o escopo da aplicacao

Sim, esse campo existe e importa. Ele limita o que o AppID pode fazer.

Para o Beco da Praia, marque no minimo:

- `CHARGE_POST` — criar cobranca Pix (`POST /api/v1/charge`)
- `CHARGE_GET` — consultar cobranca

Se aparecerem escopos de webhook (ex.: `WEBHOOK_*`), marque tambem se quiser cadastrar webhook via API. Webhook pela tela da OpenPix nao depende disso.

Se a tela oferecer algo como "acesso completo" / todos os escopos e voce estiver so testando, pode marcar tudo. Em producao, prefira so cobranca.

5. Clique em **Salvar**.
6. Confirme o fator de autenticacao (2FA), se a OpenPix pedir.
7. Na tela da aplicacao criada, copie o **AppID**.
8. Guarde esse valor: sera o parametro `OpenPixAppId` no `sam deploy`.

Nao versionar o AppID no Git. Nao use prefixo `Bearer` — o backend envia o AppID puro no header `Authorization`.

## 2. Definir o token do webhook

Gere um segredo forte. O comando **cria** o token; copie a saida do terminal. Nao precisa colocar nada na frente do comando.

Preferido no Mac (funciona com Python padrao):

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Alternativas:

```bash
# OpenSSL / LibreSSL (precisa de espaco entre -hex e 32)
openssl rand -hex 32

# Sem OpenSSL
uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]'
```

Exemplo de saida:

```text
a7c3e91f2b4d6a8c0e1f3b5d7a9c2e4f6b8d0a1c3e5f7a9b1d3e5f7a9b1c3d5
```

Guarde esse valor: sera o parametro `OpenPixWebhookToken` no deploy e o header `Authorization` no webhook da OpenPix.

Se `openssl rand -hex 32` falhar com `Extra option: "32"`, use a opcao com `python3` acima. Confira tambem se o comando foi copiado com espaco entre `-hex` e `32`.

## 3. Fazer o deploy do backend primeiro

O cadastro do webhook na OpenPix exige uma URL publica que responda `200` no teste.

### Pre-requisitos no Mac

```bash
aws --version
sam --version
aws sts get-caller-identity
```

A conta precisa de permissao para criar Lambda, API Gateway HTTP API, DynamoDB e IAM roles. Regiao padrao do projeto: `us-east-1`.

### Estimativa de custo (dev / baixo volume)

Arquitetura: 1 Lambda Java 17 (1024 MB), HTTP API, DynamoDB on-demand, IoT publish.

| Servico | Uso estimado | Custo mensal aproximado |
| --- | --- | --- |
| Lambda | ~3k pedidos, ~1–2 s cada | perto de zero (dentro do free tier) |
| API Gateway HTTP | ~10k requests | < US$ 1 |
| DynamoDB on-demand | poucos milhares de writes/reads | < US$ 1 |
| IoT Core | mensagens de impressao | < US$ 1 |
| **Total** | restaurante pequeno | **~US$ 0–3 / mes** |

### Build

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
./mvnw -pl backend -am -DskipTests package
ls -lh backend/target/function.zip
```

### Deploy

Com `samconfig.toml` (stack `beco-orders`, regiao `us-east-1`):

```bash
export OPENPIX_APP_ID='cole_o_appid_aqui'
export OPENPIX_WEBHOOK_TOKEN='cole_o_token_do_passo_2_aqui'

# Opcional: endpoint IoT (depois de criar a Thing)
# export IOT_DATA_ENDPOINT='https://xxxxxxxxxxxxxx-ats.iot.us-east-1.amazonaws.com'

sam deploy \
  --parameter-overrides \
    "PrinterOrdersTopic=beco/printer/kitchen/orders" \
    "OrdersTableName=BecoOrders" \
    "IotDataEndpoint=${IOT_DATA_ENDPOINT:-}" \
    "OpenPixBaseUrl=https://api.openpix.com.br" \
    "OpenPixAppId=${OPENPIX_APP_ID}" \
    "OpenPixWebhookToken=${OPENPIX_WEBHOOK_TOKEN}" \
    "PixChargeExpiresInSeconds=900"
```

Ou guiado:

```bash
sam deploy --guided
```

Durante o deploy guiado, informe:

- Stack: `beco-orders`
- Regiao: `us-east-1`
- `OpenPixBaseUrl`: `https://api.openpix.com.br` (producao) ou `https://api.woovi-sandbox.com` (sandbox)
- `OpenPixAppId`: AppID do passo 1
- `OpenPixWebhookToken`: token do passo 2

Ao final, anote o output `OrdersApiUrl` / `OpenPixWebhookUrl`, no formato:

```text
https://<api-id>.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook
```

Nao versionar AppID nem token no Git.

## 4. Criar o webhook na plataforma OpenPix

URLs do ambiente atual (stack `beco-orders`, `us-east-1`):

| Uso | URL |
| --- | --- |
| API de pedidos | `https://82x7kkich5.execute-api.us-east-1.amazonaws.com` |
| Webhook Pix | `https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook?token=SEU_OPENPIX_WEBHOOK_TOKEN` |

### 4.1 Webhook de cobranca paga

1. Na OpenPix/Woovi, abra **API/Plugins**.
2. Clique em **Novo Webhook** (ou **Criar Webhook**).
3. Preencha:
   - **Nome**: `Beco da Praia - Cobranca paga`
   - **Ativo**: sim
   - **Evento**: `Cobrança paga` / `OPENPIX:CHARGE_COMPLETED`
   - **Ação**: chamar API
4. **URL (recomendado, evita 401 por header):**
   ```text
   https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook?token=SEU_OPENPIX_WEBHOOK_TOKEN
   ```
   Troque `SEU_OPENPIX_WEBHOOK_TOKEN` pelo **mesmo** valor passado no `sam deploy` como `OpenPixWebhookToken`.
5. Se preferir autenticar por header em vez da query:
   - URL sem `?token=...`
   - No campo **authorization** da acao API **e/ou** em **Cabeçalhos HTTP**, adicione:
     - Nome: `Authorization`
     - Valor: o token do deploy (sem `Bearer`, sem AppID)
6. Salve.
7. A OpenPix envia um POST de teste (`evento=teste_webhook`). Com token certo, o backend responde `200`.

#### Se o teste voltar 401

Significa que a URL chegou na Lambda, mas o token nao bateu.

Checklist:

1. O valor no webhook **nao** e o AppID — e o `OPENPIX_WEBHOOK_TOKEN`.
2. Sem espacos no inicio/fim do token.
3. Sem prefixo `Bearer `.
4. Preferira a URL com `?token=...` (passo 4 acima).
5. Valide no terminal (troque `SEU_TOKEN`):

```bash
# Deve retornar 200
curl -sS -w "\nHTTP:%{http_code}\n" \
  -X POST 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook?token=SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"data_criacao":"2026-08-03T19:55:34.090Z","evento":"teste_webhook","event":"OPENPIX:CHARGE_COMPLETED"}'

# Sem token deve retornar 401
curl -sS -w "\nHTTP:%{http_code}\n" \
  -X POST 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook' \
  -H 'Content-Type: application/json' \
  -d '{"evento":"teste_webhook","event":"OPENPIX:CHARGE_COMPLETED"}'
```

### 4.2 Webhook de cobranca expirada

Repita o passo 4.1 com:

- **Nome**: `Beco da Praia - Cobranca expirada`
- **Evento**: `Cobrança expirada` / `OPENPIX:CHARGE_EXPIRED`
- **URL** (com o mesmo token):
  ```text
  https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook?token=SEU_OPENPIX_WEBHOOK_TOKEN
  ```

### 4.3 Teste rapido do token (opcional)

No terminal, troque `SEU_TOKEN` pelo valor real:

```bash
curl -sS -w "\nHTTP:%{http_code}\n" \
  -X POST 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook?token=SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"evento":"teste_webhook","event":"OPENPIX:CHARGE_COMPLETED"}'
```

Esperado: HTTP `200` e `"status":"WEBHOOK_TEST_OK"`.  
Sem o token correto, a API responde `401`.

### Alternativa via API

```bash
curl --request POST 'https://api.openpix.com.br/api/openpix/v1/webhook' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: <SEU_APP_ID>' \
  --data-raw '{
    "webhook": {
      "name": "Beco da Praia - Cobranca paga",
      "event": "OPENPIX:CHARGE_COMPLETED",
      "url": "https://82x7kkich5.execute-api.us-east-1.amazonaws.com/payments/openpix/webhook",
      "authorization": "<MESMO_OPENPIX_WEBHOOK_TOKEN>",
      "isActive": true
    }
  }'
```

Repita com `"event": "OPENPIX:CHARGE_EXPIRED"` para expiracao.

## 5. Conferir o frontend

O arquivo `config.js` do repositorio ja aponta para a API deployada:

```js
window.BECO_ORDERS_API_BASE_URL = window.BECO_ORDERS_API_BASE_URL || 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com';
```

### 5.1 Publicar o frontend

1. Confirme que esta branch (ou `main`, se ja mergeada) tem esse `config.js`.
2. Se o cardapio usa GitHub Pages, faca merge/push e aguarde o workflow `Deploy static content to Pages`.
3. Abra o cardapio no celular/navegador e limpe cache se ainda apontar para URL antiga (`Cmd+Shift+R` no Mac).

### 5.2 Conferencia no navegador

1. Abra o cardapio publicado.
2. Abra o DevTools → Console / Network.
3. Monte um pedido e envie.
4. A chamada deve ir para:
   `https://82x7kkich5.execute-api.us-east-1.amazonaws.com/orders`
5. A tela de Pix deve mostrar QR Code / copia-e-cola reais (nao mock).

## 6. Teste ponta a ponta

### 6.1 Criar pedido pelo cardapio

1. Abra o cardapio.
2. Adicione um item barato (ex.: Dadinho).
3. Escolha viagem + nome, ou local + mesa.
4. Finalize com Pix.
5. Anote a **senha/orderId** exibida (ex.: `B1785786507899-225`).

### 6.2 Conferir pedido na API

```bash
curl -sS 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com/orders/SEU_ORDER_ID'
```

Esperado antes do pagamento: `"status":"PAYMENT_PENDING"`.

### 6.3 Pagar o Pix

1. Pague com o app do banco (valor baixo em producao).
2. Na OpenPix, em Webhooks / entregas, confira se `OPENPIX:CHARGE_COMPLETED` foi enviado com sucesso (`200`).

### 6.4 Confirmar status apos pagamento

```bash
curl -sS 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com/orders/SEU_ORDER_ID'
```

Esperado apos webhook: `"status":"PAID"` ou `"PRINT_REQUESTED"`.

### 6.5 Impressao (se Raspberry Pi estiver configurado)

1. Confirme que o agente esta online e assinado em `beco/printer/kitchen/orders`.
2. A impressora da cozinha deve sair com o pedido.
3. Se nao imprimir, veja `RASPBERRY_PI_SETUP.md` e o `IOT_DATA_ENDPOINT` no deploy.

## Checklist pos-deploy (agora)

- [x] Backend deployado na AWS
- [x] `POST /orders` cria cobranca Pix real
- [ ] Webhook `OPENPIX:CHARGE_COMPLETED` cadastrado com `Authorization`
- [ ] Webhook `OPENPIX:CHARGE_EXPIRED` cadastrado com `Authorization`
- [ ] Frontend publicado com `config.js` apontando para a API
- [ ] Pix de teste pago e pedido mudou para `PAID` / `PRINT_REQUESTED`
- [ ] (Opcional) Raspberry Pi imprimindo

## Checklist rapido antes do deploy

- [ ] AppID gerado e guardado fora do Git
- [ ] Token do webhook gerado e guardado fora do Git
- [ ] `OpenPixBaseUrl` apontando para producao ou sandbox conforme o ambiente
- [ ] Parametros SAM `OpenPixAppId` e `OpenPixWebhookToken` preenchidos
- [ ] Webhooks `CHARGE_COMPLETED` e `CHARGE_EXPIRED` ativos na OpenPix
- [ ] Header `Authorization` do webhook igual ao `OPENPIX_WEBHOOK_TOKEN`
- [ ] `config.js` com a URL da API Gateway

## Troubleshooting

### Webhook recusado na criacao

- Confirme que a URL ja esta publicada (deploy feito).
- Confirme que o header `Authorization` bate com `OPENPIX_WEBHOOK_TOKEN`.
- O backend aceita o evento de teste `teste_webhook` sem `correlationID`.
- Teste com o `curl` do passo 4.3.

### Pedido fica em `PAYMENT_PENDING`

- Verifique entregas do webhook na OpenPix (status HTTP).
- Confirme o evento `OPENPIX:CHARGE_COMPLETED`.
- Confirme que `charge.correlationID` e o `orderId` do pedido.
- Confirme que o header `Authorization` esta igual ao token do deploy.

### Erro ao criar cobranca

- Confirme `OPENPIX_APP_ID`.
- Confirme `OPENPIX_BASE_URL` (producao vs sandbox).
- AppID de sandbox nao funciona na API de producao e vice-versa.
- Nao envie `customer` so com nome; a OpenPix exige name+(cpf/email/telefone). O backend atual omite `customer` e coloca nome/mesa no `comment`.
