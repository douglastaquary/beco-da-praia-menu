# AGENTS.md

## Cursor Cloud specific instructions

Projeto: cardápio online "Beco da Praia" (produto único em monorepo Maven). Componentes:
frontend estático (`index.html`, `orders.js`, `style.css`, `config.js`), backend Quarkus/Java
(`backend/`, roda como Lambda em produção) e `printer-agent/` (agente Java para Raspberry Pi/impressora ESC/POS).

Comandos padrão de lint/test/build/run estão no `README.md` ("Build e testes" e "Operacao local"). Notas não óbvias abaixo.

### Ambiente
- O ambiente tem **Java 21**, mas o projeto compila com `release 17` (`maven.compiler.release=17`) — compila normal.
- Maven não está no PATH: use sempre o wrapper `./mvnw` (baixa o Maven 3.9.9 e as dependências no primeiro uso).
- `sam` (AWS SAM CLI) não está instalado; só é necessário para deploy na AWS, não para dev local.

### Backend (Quarkus dev)
- Rodar em dev: `ORDERS_TABLE=BecoOrders ./mvnw -pl backend quarkus:dev` (HTTP em `:8080`, debug em `:5005`).
- **Gotcha crítico**: a config property `ORDERS_TABLE` é obrigatória e não tem default. Sem ela, o
  `quarkus:dev` **falha ao iniciar**. O erro real é `ConfigurationException: ... ORDERS_TABLE`; ele costuma
  aparecer acompanhado de um erro secundário e enganoso `Port(s) already bound: 8080` (parte da recuperação
  do dev mode, não a causa raiz). Defina `ORDERS_TABLE` antes de subir.
- Sem credenciais AWS / OpenPix no ambiente: a validação de pedido funciona (`POST /orders` com corpo
  inválido retorna 400 com mensagens em português), mas qualquer caminho que toque o DynamoDB
  (`GET /orders/{id}` e a persistência dentro do `POST /orders`) retorna 500. Isso é esperado localmente.
  Order persistence, cobrança Pix (OpenPix) e publicação no AWS IoT exigem `AWS_*` + `OPENPIX_APP_ID`/
  `OPENPIX_WEBHOOK_TOKEN` reais; não há DynamoDB Local/LocalStack no repo.

### Frontend
- Servir estático: `python3 -m http.server 8000 --bind 127.0.0.1` e abrir `http://127.0.0.1:8000/`.
- `config.js` define `window.BECO_ORDERS_API_BASE_URL` (vazio = mesmo domínio `/orders`). Para apontar
  para o backend local, defina `http://localhost:8080`.
- O fluxo de pedido/Pix pode ser inspecionado sem backend usando o parâmetro de URL
  `?screenshot=cardapio|detalhe|carrinho|pix|pix-copiado|sucesso` (dados mockados).
