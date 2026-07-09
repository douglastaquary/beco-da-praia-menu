# Beco da Praia Menu

Cardapio online do Beco da Praia com fluxo de pedidos integrado a uma arquitetura serverless em Java.

## Visao geral

O projeto mantem o cardapio web estatico existente e adiciona um fluxo de pedido direto pelo cardapio:

1. Cliente acessa o cardapio.
2. Escolhe itens, quantidade, observacoes, nome e forma de pagamento.
3. Frontend envia o pedido para a API.
4. Backend Quarkus em AWS Lambda salva no DynamoDB.
5. Backend publica o pedido no AWS IoT Core.
6. Raspberry Pi no restaurante recebe o pedido e imprime na cozinha via impressora ESC/POS TCP/IP.

```text
Cardapio Web
  -> API Gateway
  -> Lambda Java/Quarkus
  -> DynamoDB
  -> AWS IoT Core
  -> Raspberry Pi
  -> Impressora ESC/POS
```

## Estrutura

- `index.html`, `style.css`, `orders.js`, `config.js`: frontend do cardapio e carrinho de pedidos.
- `cardapio.md`: cardapio atualizado com os produtos reais refletidos pela branch `main`.
- `backend/`: API Java/Quarkus para pedidos, DynamoDB e publicacao no AWS IoT Core.
- `printer-agent/`: agente Java para rodar no Raspberry Pi e imprimir pedidos na cozinha.
- `template.yaml`: template AWS SAM para API Gateway, Lambda e DynamoDB.
- `RASPBERRY_PI_SETUP.md`: passo a passo de configuracao do Raspberry Pi.

## Configuracao do frontend

Por padrao, o frontend envia pedidos para `/orders` no mesmo dominio.

Para usar uma API Gateway externa, atualizar `config.js`:

```js
window.BECO_ORDERS_API_BASE_URL = 'https://sua-api.execute-api.regiao.amazonaws.com';
```

## Backend

Endpoints principais:

- `POST /orders`: cria pedido, salva no DynamoDB e publica no AWS IoT Core.
- `GET /orders/{orderId}`: consulta pedido.
- `POST /orders/{orderId}/reprint`: republica pedido para impressao.
- `POST /orders/{orderId}/print-status`: atualiza status de impressao.

Variaveis usadas pela Lambda:

- `ORDERS_TABLE`
- `PRINTER_ORDERS_TOPIC`
- `IOT_DATA_ENDPOINT`

## Raspberry Pi

O agente local usa certificados X.509 do AWS IoT Core e assina o topico:

```text
beco/printer/kitchen/orders
```

Ao receber um pedido, imprime na impressora ESC/POS configurada por:

- `PRINTER_HOST`
- `PRINTER_PORT`

O passo a passo completo esta em `RASPBERRY_PI_SETUP.md`.

## Build e testes

```bash
./mvnw test
./mvnw -DskipTests package
```

Artefatos esperados:

- `backend/target/function.zip`
- `printer-agent/target/beco-printer-agent-1.0.0-SNAPSHOT.jar`

## Deploy AWS

Build:

```bash
./mvnw -DskipTests package
```

Deploy guiado:

```bash
sam deploy --guided
```

No deploy, informar:

- Nome da stack.
- Regiao AWS.
- Nome da tabela DynamoDB, se diferente do padrao.
- Topico AWS IoT Core.
- Endpoint data plane do AWS IoT Core, quando necessario.
