package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.PaymentDetails;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class OpenPixClient {
    private static final String PROVIDER = "OPENPIX";

    @ConfigProperty(name = "OPENPIX_BASE_URL", defaultValue = "https://api.openpix.com.br")
    String baseUrl;

    @ConfigProperty(name = "OPENPIX_APP_ID")
    Optional<String> appId;

    @ConfigProperty(name = "PIX_CHARGE_EXPIRES_IN_SECONDS", defaultValue = "900")
    long chargeExpiresInSeconds;

    @Inject
    ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public PaymentDetails createCharge(String orderId, BigDecimal amount, String customerName) {
        String token = appId.filter(value -> !value.isBlank())
                .orElseThrow(() -> new IllegalStateException("OPENPIX_APP_ID nao configurado."));
        long amountInCents = amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        Instant expiresAt = Instant.now().plusSeconds(chargeExpiresInSeconds);

        Map<String, Object> payload = Map.of(
                "correlationID", orderId,
                "value", amountInCents,
                "comment", "Pedido Beco da Praia " + orderId,
                "expiresIn", chargeExpiresInSeconds,
                "customer", Map.of("name", customerName)
        );

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl.replaceAll("/$", "") + "/api/v1/charge"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", token)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String body = response.body() == null ? "" : response.body().trim();
                if (body.length() > 300) {
                    body = body.substring(0, 300) + "...";
                }
                throw new IllegalStateException(
                        "OpenPix retornou HTTP " + response.statusCode()
                                + (body.isBlank() ? "." : ": " + body));
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode charge = root.path("charge");
            return new PaymentDetails(
                    PROVIDER,
                    "PAYMENT_PENDING",
                    firstText(charge, root, "correlationID", "correlationId", "id").orElse(orderId),
                    firstText(charge, root, "txID", "txId", "transactionID", "transactionId").orElse(""),
                    firstText(charge, root, "brCode", "brcode", "emv").orElse(""),
                    firstText(charge, root, "qrCodeImage", "qrCodeImageBase64", "qrCode").orElse(""),
                    firstText(charge, root, "paymentLinkUrl", "paymentLink", "globalID").orElse(""),
                    expiresAt
            );
        } catch (IOException e) {
            throw new IllegalStateException("Nao foi possivel criar cobranca Pix.", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Criacao da cobranca Pix foi interrompida.", e);
        }
    }

    private Optional<String> firstText(JsonNode charge, JsonNode root, String... names) {
        for (String name : names) {
            String value = text(charge.path(name));
            if (!value.isBlank()) {
                return Optional.of(value);
            }
            value = text(root.path(name));
            if (!value.isBlank()) {
                return Optional.of(value);
            }
        }
        return Optional.empty();
    }

    private String text(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? "" : node.asText("");
    }
}
