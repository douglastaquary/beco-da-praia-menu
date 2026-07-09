# Configuracao do Raspberry Pi - Impressao da Cozinha

Este guia descreve a configuracao do Raspberry Pi que ficara no Beco da Praia para receber pedidos via AWS IoT Core e imprimir na impressora ESC/POS da cozinha pela rede local.

## Visao geral

Fluxo esperado:

```text
Cardapio web
  -> API Gateway
  -> Lambda Java/Quarkus
  -> DynamoDB
  -> AWS IoT Core
  -> Raspberry Pi
  -> Impressora ESC/POS TCP/IP
```

O Raspberry Pi nao recebe conexoes externas. Ele abre uma conexao segura de saida com o AWS IoT Core, assina o topico de pedidos e imprime localmente na impressora da cozinha.

## Pre-requisitos

- Raspberry Pi com Raspberry Pi OS Lite 64-bit.
- Acesso SSH habilitado.
- Java 17 instalado.
- Impressora ESC/POS conectada na mesma rede Wi-Fi ou cabeada do Raspberry Pi.
- IP fixo ou reserva DHCP para a impressora.
- Thing, certificado e policy criados no AWS IoT Core.
- JAR do agente de impressao gerado pelo projeto.

## 1. Instalar o Raspberry Pi OS

Use o Raspberry Pi Imager e grave o Raspberry Pi OS Lite 64-bit no microSD.

Durante a configuracao avancada do Imager, definir:

- Hostname: `beco-printer-01`
- SSH: habilitado
- Usuario: `pi` ou usuario operacional definido pelo restaurante
- Wi-Fi: rede do Beco da Praia
- Locale/timezone: `America/Sao_Paulo`

Depois de ligar o Raspberry Pi, acessar por SSH:

```bash
ssh pi@beco-printer-01.local
```

Se o mDNS nao resolver, usar o IP do Raspberry Pi:

```bash
ssh pi@<IP_DO_RASPBERRY>
```

## 2. Atualizar o sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

Apos reiniciar, conectar novamente via SSH.

## 3. Instalar Java e ferramentas de diagnostico

```bash
sudo apt install -y openjdk-17-jre-headless curl unzip netcat-openbsd
java -version
```

A versao exibida deve ser Java 17 ou superior.

## 4. Testar comunicacao com a impressora

Confirmar o IP da impressora no roteador ou no painel da impressora.

Testar porta ESC/POS:

```bash
nc -vz <IP_DA_IMPRESSORA> 9100
```

O resultado esperado e uma conexao bem-sucedida. Se falhar, revisar:

- Raspberry Pi e impressora na mesma rede.
- IP da impressora.
- Porta TCP, normalmente `9100`.
- Firewall ou isolamento de clientes no roteador.

## 5. Criar Thing no AWS IoT Core

No console da AWS:

1. Acessar AWS IoT Core.
2. Criar uma Thing chamada `beco-printer-01`.
3. Criar certificado X.509 para a Thing.
4. Baixar os arquivos:
   - Certificado do dispositivo.
   - Chave privada.
   - Amazon Root CA 1.
5. Ativar o certificado.
6. Criar uma policy para permitir conexao MQTT, subscribe, receive e publish.
7. Anexar a policy ao certificado.

Topicos usados pelo agente:

```text
beco/printer/kitchen/orders
beco/printer/kitchen/status
```

## 6. Preparar diretorios no Raspberry Pi

```bash
sudo mkdir -p /opt/beco-printer
sudo mkdir -p /etc/beco-printer/certs
sudo mkdir -p /var/log/beco-printer
sudo chown -R pi:pi /opt/beco-printer /var/log/beco-printer
```

Copiar os certificados para:

```text
/etc/beco-printer/certs/
```

Permissoes recomendadas:

```bash
sudo chmod 700 /etc/beco-printer/certs
sudo chmod 600 /etc/beco-printer/certs/*
```

## 7. Criar arquivo de ambiente

Criar o arquivo:

```bash
sudo nano /etc/beco-printer/beco-printer.env
```

Conteudo:

```bash
AWS_IOT_ENDPOINT=<ENDPOINT_AWS_IOT>
AWS_IOT_CLIENT_ID=beco-printer-01
AWS_IOT_TOPIC_ORDERS=beco/printer/kitchen/orders
AWS_IOT_TOPIC_STATUS=beco/printer/kitchen/status
AWS_IOT_CERT_PATH=/etc/beco-printer/certs/device.pem.crt
AWS_IOT_PRIVATE_KEY_PATH=/etc/beco-printer/certs/private.pem.key
AWS_IOT_ROOT_CA_PATH=/etc/beco-printer/certs/AmazonRootCA1.pem
PRINTER_HOST=<IP_DA_IMPRESSORA>
PRINTER_PORT=9100
ORDERS_API_BASE_URL=<URL_DA_API_ORDERS>
```

Proteger o arquivo:

```bash
sudo chmod 600 /etc/beco-printer/beco-printer.env
```

## 8. Instalar o JAR do agente

Copiar o JAR gerado pelo modulo `printer-agent` para:

```bash
sudo cp printer-agent/target/beco-printer-agent-1.0.0-SNAPSHOT.jar /opt/beco-printer/beco-printer-agent.jar
sudo chown pi:pi /opt/beco-printer/beco-printer-agent.jar
```

Testar manualmente:

```bash
set -a
. /etc/beco-printer/beco-printer.env
set +a
java -jar /opt/beco-printer/beco-printer-agent.jar
```

Se a conexao com o AWS IoT Core funcionar, encerrar com `Ctrl+C` e configurar o servico.

## 9. Criar servico systemd

Criar:

```bash
sudo nano /etc/systemd/system/beco-printer.service
```

Conteudo:

```ini
[Unit]
Description=Beco da Praia Kitchen Printer Agent
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/etc/beco-printer/beco-printer.env
ExecStart=/usr/bin/java -jar /opt/beco-printer/beco-printer-agent.jar
Restart=always
RestartSec=5
User=pi
WorkingDirectory=/opt/beco-printer

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable beco-printer
sudo systemctl start beco-printer
```

## 10. Verificar logs

```bash
systemctl status beco-printer
journalctl -u beco-printer -f
```

O agente deve registrar:

- Inicializacao.
- Conexao com AWS IoT Core.
- Assinatura do topico de pedidos.
- Resultado de cada tentativa de impressao.

## 11. Teste final

1. Abrir o cardapio.
2. Criar um pedido com nome do cliente e forma de pagamento.
3. Confirmar que o pedido foi salvo no DynamoDB.
4. Confirmar que a Lambda publicou o evento no AWS IoT Core.
5. Confirmar que o Raspberry Pi recebeu o pedido.
6. Confirmar a impressao na cozinha.
7. Confirmar atualizacao do status para `PRINTED`.

## Troubleshooting

### Raspberry Pi nao conecta no AWS IoT Core

- Conferir `AWS_IOT_ENDPOINT`.
- Conferir certificado, chave privada e Root CA.
- Conferir se o certificado esta ativo.
- Conferir se a IoT policy foi anexada ao certificado.
- Conferir se o client id e permitido pela policy.

### Pedido chega, mas nao imprime

- Testar `nc -vz <IP_DA_IMPRESSORA> 9100`.
- Conferir `PRINTER_HOST`.
- Conferir se a impressora esta ligada e na mesma rede.
- Conferir se o roteador nao esta bloqueando comunicacao entre clientes Wi-Fi.

### Servico nao inicia

```bash
journalctl -u beco-printer -n 100 --no-pager
```

Validar:

- Caminho do JAR.
- Permissoes dos certificados.
- Usuario configurado no systemd.
- Variaveis no arquivo `/etc/beco-printer/beco-printer.env`.

## Checklist operacional

- Raspberry Pi liga automaticamente.
- Servico `beco-printer` inicia no boot.
- Impressora tem IP fixo ou reserva DHCP.
- Certificados estao protegidos.
- Pedido de teste imprime corretamente.
- Falha de impressao aparece nos logs.
- Status do pedido e atualizado apos impressao.
