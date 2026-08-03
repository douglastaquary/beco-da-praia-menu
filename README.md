# Beco da Praia Menu

Cardapio online do Beco da Praia com fluxo de pedidos direto da mesa, backend serverless em Java/Quarkus e impressao local na cozinha via Raspberry Pi.

## Objetivo

O projeto partiu de um cardapio web estatico acessado pelo `index.html`. A feature atual mantem a navegacao do cardapio e adiciona a montagem do pedido online, com variacoes obrigatorias, observacoes e envio para a cozinha.

O foco inicial da experiencia e mobile. A tela de detalhe do item abre como uma nova tela do fluxo, com botao voltar, em vez de modal, para reduzir friccao em celulares.

## Stack

- Frontend estatico: `index.html`, `style.css`, `orders.js` e `config.js`.
- Backend local/serverless: Java 17 com Quarkus.
- Empacotamento: Maven multi-modulo.
- Deploy AWS: AWS SAM usando `template.yaml`.
- Processamento: AWS Lambda com Quarkus Amazon Lambda HTTP.
- API publica: Amazon API Gateway HTTP API.
- Banco de dados: Amazon DynamoDB.
- Fila/evento de impressao: AWS IoT Core.
- Agente local: Java 17 em Raspberry Pi, com suporte documentado para Raspberry Pi 2 ARMv7 32-bit.
- Impressora: ESC/POS via TCP/IP na rede Wi-Fi do restaurante.

Nao fazem parte da arquitetura atual:

- Node.js como runtime de backend.
- Docker/container.
- Kubernetes.

## Arquitetura

```text
Cliente no celular
  -> Cardapio web estatico
  -> API Gateway HTTP API
  -> Lambda Java/Quarkus
  -> DynamoDB
  -> AWS IoT Core
  -> Raspberry Pi no restaurante
  -> Impressora ESC/POS da cozinha
```

### Fluxo de pedido

1. O cliente acessa o cardapio pelo celular.
2. Escolhe um item do cardapio.
3. A aplicacao abre a tela de detalhe do item.
4. O cliente informa quantidade, variacoes obrigatorias e observacoes.
5. O item e adicionado ao carrinho.
6. O cliente escolhe se vai comer no local ou levar para viagem.
7. Para comer no local, informa a mesa. Para viagem, informa o nome para retirada.
8. O frontend envia o pedido para `POST /orders` com pagamento Pix.
9. O backend cria uma cobranca dinamica na OpenPix/Woovi e retorna QR Code/copia-e-cola.
10. O webhook da OpenPix/Woovi confirma o pagamento e libera a impressao.
11. O Raspberry Pi recebe a mensagem e imprime na cozinha.
12. O cliente acompanha pela senha do pedido, formada pelos 3 ultimos digitos numericos do pedido.

### Fluxo visual do pedido

Os prints abaixo usam dados mockados para demonstrar o fluxo mobile de pedido e pagamento Pix.

| Etapa | Print |
| --- | --- |
| Cardapio | <img src="docs/screenshots/01-cardapio.png" alt="Cardapio mobile" width="220"> |
| Detalhe do item | <img src="docs/screenshots/02-detalhe-item.png" alt="Detalhe do item com opcoes" width="220"> |
| Carrinho | <img src="docs/screenshots/03-carrinho.png" alt="Carrinho do pedido" width="220"> |
| Pagamento Pix | <img src="docs/screenshots/04-pix-pagamento.png" alt="Pagamento Pix com QR Code e copia e cola" width="220"> |
| Pix copiado | <img src="docs/screenshots/05-pix-copiado.png" alt="Confirmacao de codigo Pix copiado" width="220"> |
| Sucesso | <img src="docs/screenshots/06-sucesso-cozinha.png" alt="Pedido enviado para a cozinha" width="220"> |

## Regras de cardapio

O fluxo de pedido respeita regras especificas para evitar pedidos incompletos:

- Alguns itens temporariamente removidos do cardapio online nao aparecem para pedido.
- Nas entradinhas, apenas Dadinho de tapioca, Batata frita e Caldinho de feijao estao disponiveis para pedido direto da mesa.
- Itens indisponiveis aparecem sem botao de adicionar ao pedido.
- Itens disponiveis para compra exibem a tag visual `Pedido online`.
- Pedidos online e direto da mesa aceitam somente pagamento via Pix.
- Pedido para comer no local exige mesa; pedido para viagem exige nome para retirada.
- A senha exibida ao cliente e impressa na cozinha usa os 3 ultimos digitos numericos do pedido.
- Pratos com carne exigem escolha do ponto quando necessario: ao ponto, bem passado ou mal passado.
- Arrumadinho e Panelinha de Lingua nao exigem ponto da carne.
- Porcoes com preco meia/inteira exigem escolha do tamanho antes de adicionar ao carrinho.
- Opcoes e observacoes sao enviadas ao backend e impressas junto do item para reduzir erro operacional.

## Estrutura do projeto

```text
.
|-- index.html
|-- style.css
|-- orders.js
|-- config.js
|-- cardapio.md
|-- template.yaml
|-- RASPBERRY_PI_SETUP.md
|-- backend/
|   |-- pom.xml
|   `-- src/
`-- printer-agent/
    |-- pom.xml
    `-- src/
```

### Frontend

- `index.html`: estrutura do cardapio e carregamento dos scripts.
- `style.css`: layout mobile-first, carrinho e tela de detalhe do produto.
- `orders.js`: carrinho, regras de variacao, validacao do pedido e envio para API.
- `config.js`: configuracao da URL da API de pedidos.
- `cardapio.md`: referencia textual do cardapio.

Por padrao, o frontend envia pedidos para `/orders` no mesmo dominio.

Para usar uma API Gateway externa, configure `config.js`:

```js
window.BECO_ORDERS_API_BASE_URL = 'https://sua-api.execute-api.regiao.amazonaws.com';
```

### Backend

Modulo: `backend/`

Responsabilidades:

- Receber pedidos.
- Validar campos obrigatorios.
- Rejeitar pedidos online com forma de pagamento diferente de Pix.
- Validar se o pedido e para comer no local ou viagem.
- Validar itens e opcoes do pedido.
- Persistir pedido no DynamoDB.
- Publicar evento de impressao no AWS IoT Core.
- Permitir consulta, reimpressao e atualizacao de status de impressao.

Endpoints:

- `POST /orders`: cria pedido.
- `GET /orders/{orderId}`: consulta pedido.
- `POST /orders/{orderId}/reprint`: republica pedido para impressao.
- `POST /orders/{orderId}/print-status`: atualiza status de impressao.
- `POST /payments/openpix/webhook`: recebe eventos de pagamento Pix.

Variaveis de ambiente:

- `ORDERS_TABLE`: tabela DynamoDB de pedidos.
- `PRINTER_ORDERS_TOPIC`: topico IoT usado pela cozinha.
- `IOT_DATA_ENDPOINT`: endpoint data plane do AWS IoT Core.
- `OPENPIX_BASE_URL`: URL da OpenPix/Woovi (`https://api.openpix.com.br` em producao).
- `OPENPIX_APP_ID`: AppID da aplicacao OpenPix/Woovi.
- `OPENPIX_WEBHOOK_TOKEN`: segredo compartilhado; a OpenPix deve enviar no header `Authorization` do webhook.
- `PIX_CHARGE_EXPIRES_IN_SECONDS`: tempo de expiracao da cobranca Pix.

O passo a passo para AppID, webhook e checklist de deploy esta em `OPENPIX_SETUP.md`.

Status principais:

- `PAYMENT_PENDING`: pedido Pix criado e aguardando pagamento.
- `PAID`: Pix confirmado pelo webhook.
- `PRINT_REQUESTED`: pedido enviado para impressao.
- `PRINTED`: agente confirmou impressao.
- `PRINT_FAILED`: agente falhou ao imprimir.
- `PAYMENT_EXPIRED`: cobranca Pix expirou.

### Printer Agent

Modulo: `printer-agent/`

Responsabilidades:

- Rodar no Raspberry Pi dentro da rede Wi-Fi do restaurante.
- Conectar ao AWS IoT Core com certificado X.509.
- Assinar o topico de pedidos da cozinha.
- Converter o pedido em texto ESC/POS.
- Imprimir item, quantidade, variacoes e observacoes na impressora da cozinha.

Hardware local:

- Recomendado: Raspberry Pi 3, Raspberry Pi 4 ou Raspberry Pi Zero 2 W.
- Suportado com limitacoes: Raspberry Pi 2 ARMv7 32-bit com Raspberry Pi OS Lite 32-bit e Java 17 32-bit.
- Nao recomendado: Raspberry Pi Zero ou Zero W original, pois usam ARMv6 e tem baixa compatibilidade pratica com Java 17.

O Raspberry Pi executa somente o `printer-agent`. O backend Quarkus continua no fluxo serverless da AWS via Lambda, DynamoDB e API Gateway.

Topico padrao:

```text
beco/printer/kitchen/orders
```

Configuracoes principais:

- `AWS_IOT_ENDPOINT`
- `AWS_IOT_CLIENT_ID`
- `AWS_IOT_CERT_PATH`
- `AWS_IOT_PRIVATE_KEY_PATH`
- `AWS_IOT_TOPIC_ORDERS`
- `AWS_IOT_TOPIC_STATUS`
- `PRINTER_HOST`
- `PRINTER_PORT`

O passo a passo do Raspberry Pi 2 ARMv7 32-bit, instalacao do Java, instalacao do JAR e configuracao do servico `beco-printer` esta em `RASPBERRY_PI_SETUP.md`.

## AWS SAM

O arquivo `template.yaml` define:

- `AWS::Serverless::HttpApi` para expor os endpoints.
- `AWS::Serverless::Function` Java 17 arm64 para o backend Quarkus.
- `AWS::DynamoDB::Table` com billing `PAY_PER_REQUEST`.
- Permissoes da Lambda para DynamoDB e `iot:Publish`.
- Rota de webhook `/payments/openpix/webhook` para confirmacao do Pix.

Outputs principais:

- `OrdersApiUrl`
- `OrdersTableName`
- `PrinterOrdersTopic`
- `OpenPixWebhookUrl`

## Build e testes

Rodar todos os testes:

```bash
./mvnw test
```

Validar os scripts do frontend:

```bash
node --check orders.js
node --check config.js
```

Gerar os artefatos:

```bash
./mvnw -DskipTests package
```

Artefatos esperados:

- `backend/target/function.zip`
- `printer-agent/target/beco-printer-agent-1.0.0-SNAPSHOT.jar`

## Deploy

Build:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
./mvnw -pl backend -am -DskipTests package
```

Deploy (veja detalhes e OpenPix em `OPENPIX_SETUP.md`):

```bash
export OPENPIX_APP_ID='...'
export OPENPIX_WEBHOOK_TOKEN='...'
sam deploy \
  --parameter-overrides \
    "OpenPixBaseUrl=https://api.openpix.com.br" \
    "OpenPixAppId=${OPENPIX_APP_ID}" \
    "OpenPixWebhookToken=${OPENPIX_WEBHOOK_TOKEN}"
```

Ou guiado:

```bash
sam deploy --guided
```

Durante o deploy, informar:

- Nome da stack (`beco-orders`).
- Regiao AWS (`us-east-1`).
- Nome da tabela DynamoDB, se diferente do padrao.
- Topico AWS IoT Core.
- Endpoint data plane do AWS IoT Core, quando necessario.
- `OpenPixBaseUrl`, `OpenPixAppId` e `OpenPixWebhookToken` (ver `OPENPIX_SETUP.md`).

Depois do deploy:

1. Copiar o output `OpenPixWebhookUrl`.
2. Cadastrar o webhook na OpenPix com header `Authorization` igual ao `OpenPixWebhookToken`.
3. Atualizar `config.js` com a URL da API Gateway.

## Operacao local

Para testar o cardapio estatico localmente:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Acessar:

```text
http://127.0.0.1:8000/
```

Para rodar o backend Quarkus em modo desenvolvimento:

```bash
./mvnw -pl backend quarkus:dev
```

## Documentacao complementar

- `OPENPIX_SETUP.md`: AppID, webhook Pix e checklist para o deploy.
- `RASPBERRY_PI_SETUP.md`: configuracao do Raspberry Pi, AWS IoT Core, servico systemd e impressora.
- `cardapio.md`: cardapio textual usado como referencia de produtos.
