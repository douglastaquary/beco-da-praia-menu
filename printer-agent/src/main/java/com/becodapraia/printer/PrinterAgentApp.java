package com.becodapraia.printer;

import com.amazonaws.services.iot.client.AWSIotMessage;
import com.amazonaws.services.iot.client.AWSIotMqttClient;
import com.amazonaws.services.iot.client.AWSIotQos;
import com.amazonaws.services.iot.client.AWSIotTopic;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

public class PrinterAgentApp {
    public static void main(String[] args) throws Exception {
        PrinterAgentConfig config = PrinterAgentConfig.fromEnvironment();
        ObjectMapper objectMapper = new ObjectMapper();
        EscPosPrinter printer = new EscPosPrinter(config.printerHost(), config.printerPort());
        PrintStatusClient statusClient = new PrintStatusClient(config.ordersApiBaseUrl(), objectMapper);

        String endpoint = CertificateKeyStore.normalizeEndpoint(config.iotEndpoint());
        if (endpoint.isBlank() || !endpoint.contains(".iot.") || !endpoint.contains("amazonaws.com")) {
            throw new IllegalStateException(
                    "AWS_IOT_ENDPOINT invalido. Use o host ATS sem https://, por exemplo: xxxxx-ats.iot.us-east-1.amazonaws.com");
        }

        CertificateKeyStore.KeyStorePasswordPair pair = CertificateKeyStore.fromPemFiles(
                config.certPath(),
                config.privateKeyPath());
        AWSIotMqttClient client = new AWSIotMqttClient(
                endpoint,
                config.clientId(),
                pair.keyStore(),
                pair.keyPassword());
        client.setCleanSession(false);
        client.connect();
        System.out.println("Connected to AWS IoT Core as " + config.clientId());

        client.subscribe(new AWSIotTopic(config.ordersTopic(), AWSIotQos.QOS1) {
            @Override
            public void onMessage(AWSIotMessage message) {
                String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
                try {
                    PrintOrder order = objectMapper.readValue(payload, PrintOrder.class);
                    printer.print(order);
                    statusClient.send(order.orderId(), "PRINTED", "Pedido impresso na cozinha.");
                    publishStatus(client, config.statusTopic(), objectMapper, order.orderId(), "PRINTED", null);
                    System.out.println("Printed order " + order.orderId());
                } catch (Exception e) {
                    String orderId = extractOrderId(objectMapper, payload);
                    statusClient.send(orderId, "PRINT_FAILED", e.getMessage());
                    publishStatus(client, config.statusTopic(), objectMapper, orderId, "PRINT_FAILED", e.getMessage());
                    System.err.println("Failed to print order " + orderId + ": " + e.getMessage());
                }
            }
        }, true);

        System.out.println("Subscribed to " + config.ordersTopic());
        new CountDownLatch(1).await();
    }

    private static void publishStatus(AWSIotMqttClient client, String topic, ObjectMapper objectMapper,
                                      String orderId, String status, String message) {
        if (topic == null || topic.isBlank()) {
            return;
        }
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "orderId", orderId == null ? "" : orderId,
                    "status", status,
                    "message", message == null ? "" : message
            ));
            client.publish(topic, AWSIotQos.QOS1, payload);
        } catch (Exception e) {
            System.err.println("Failed to publish print status: " + e.getMessage());
        }
    }

    private static String extractOrderId(ObjectMapper objectMapper, String payload) {
        try {
            return objectMapper.readTree(payload).path("orderId").asText("");
        } catch (Exception ignored) {
            return "";
        }
    }

    private static final class PrintStatusClient {
        private final String ordersApiBaseUrl;
        private final ObjectMapper objectMapper;
        private final HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        private PrintStatusClient(String ordersApiBaseUrl, ObjectMapper objectMapper) {
            this.ordersApiBaseUrl = ordersApiBaseUrl;
            this.objectMapper = objectMapper;
        }

        void send(String orderId, String status, String message) {
            if (ordersApiBaseUrl == null || ordersApiBaseUrl.isBlank() || orderId == null || orderId.isBlank()) {
                return;
            }
            try {
                String body = objectMapper.writeValueAsString(Map.of(
                        "orderId", orderId,
                        "status", status,
                        "message", message == null ? "" : message
                ));
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(ordersApiBaseUrl.replaceAll("/$", "") + "/orders/" + orderId + "/print-status"))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();
                httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            } catch (Exception e) {
                System.err.println("Failed to call print status endpoint: " + e.getMessage());
            }
        }
    }
}
