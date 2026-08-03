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

1. Em **API/Plugins**, clique em **Novo Webhook**.
2. Preencha:
   - **Nome**: `Beco da Praia - Pedidos`
   - **Ativo**: sim
   - **Evento**: comece com `Cobrança paga` / `OPENPIX:CHARGE_COMPLETED`
   - **URL**: a `OpenPixWebhookUrl` do deploy
   - **Ação**: chamar API
3. Em **Cabeçalhos HTTP** (ou campo `authorization`), adicione:
   - Nome: `Authorization`
   - Valor: o mesmo `OPENPIX_WEBHOOK_TOKEN` do deploy
4. Salve. A OpenPix envia um POST de teste (`teste_webhook`). O backend responde `200` e libera o cadastro.

Repita a criacao (ou cadastre outro webhook) para o evento `OPENPIX:CHARGE_EXPIRED` (`Cobrança expirada`), usando a mesma URL e o mesmo header `Authorization`.

### Alternativa via API

```bash
curl --request POST 'https://api.openpix.com.br/api/openpix/v1/webhook' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: <SEU_APP_ID>' \
  --data-raw '{
    "webhook": {
      "name": "Beco da Praia - Cobrança paga",
      "event": "OPENPIX:CHARGE_COMPLETED",
      "url": "https://<api-id>.execute-api.<regiao>.amazonaws.com/payments/openpix/webhook",
      "authorization": "<MESMO_OPENPIX_WEBHOOK_TOKEN>",
      "isActive": true
    }
  }'
```

Repita com `"event": "OPENPIX:CHARGE_EXPIRED"` para expiracao.

No sandbox, troque a base para `https://api.woovi-sandbox.com`.

## 5. Conferir o frontend

Em `config.js`, aponte a API publica:

```js
window.BECO_ORDERS_API_BASE_URL = 'https://<api-id>.execute-api.<regiao>.amazonaws.com';
```

## 6. Teste ponta a ponta

1. Abra o cardapio e monte um pedido com Pix.
2. Confirme que a tela mostra QR Code / copia-e-cola reais (nao mock).
3. Pague o Pix (sandbox ou valor baixo em producao).
4. Confirme na OpenPix que o webhook `OPENPIX:CHARGE_COMPLETED` retornou sucesso.
5. Confirme no backend que o pedido passou de `PAYMENT_PENDING` para `PAID` / `PRINT_REQUESTED`.
6. Se o Raspberry Pi estiver online, a impressao na cozinha deve sair.

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

### Pedido fica em `PAYMENT_PENDING`

- Verifique logs da Lambda e entregas do webhook na OpenPix.
- Confirme o evento `OPENPIX:CHARGE_COMPLETED`.
- Confirme que `charge.correlationID` e o `orderId` do pedido.

### Erro ao criar cobranca

- Confirme `OPENPIX_APP_ID`.
- Confirme `OPENPIX_BASE_URL` (producao vs sandbox).
- AppID de sandbox nao funciona na API de producao e vice-versa.
