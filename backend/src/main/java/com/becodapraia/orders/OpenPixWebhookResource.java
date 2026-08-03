package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.OrderRecord;
import com.becodapraia.orders.OrderModels.OrderResponse;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

@Path("/payments/openpix/webhook")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OpenPixWebhookResource {
    @Inject
    OrderRepository repository;

    @Inject
    PrintPublisher printPublisher;

    @ConfigProperty(name = "OPENPIX_WEBHOOK_TOKEN")
    Optional<String> webhookToken;

    @POST
    public Response receive(
            JsonNode payload,
            @HeaderParam("Authorization") String authorizationHeader,
            @HeaderParam("X-OpenPix-Webhook-Token") String headerToken,
            @QueryParam("token") String queryToken
    ) {
        if (!isAuthorized(authorizationHeader, headerToken, queryToken)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(OrderResponse.error("Webhook Pix nao autorizado."))
                    .build();
        }

        String event = firstText(payload, "event", "type", "evento");
        if (isOpenPixTestEvent(event)) {
            return Response.ok(OrderResponse.success(null, "WEBHOOK_TEST_OK")).build();
        }

        String orderId = firstText(payload,
                "charge.correlationID",
                "charge.correlationId",
                "correlationID",
                "correlationId");
        if (orderId.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(OrderResponse.error("Webhook sem correlationID."))
                    .build();
        }

        if ("OPENPIX:CHARGE_COMPLETED".equals(event)) {
            Optional<OrderRecord> order = repository.find(orderId);
            if (order.isPresent() && repository.markPaidIfPending(orderId)) {
                printPublisher.publish(order.get());
                repository.markPrintRequested(orderId);
            }
            return Response.ok(OrderResponse.success(orderId, "PAID")).build();
        }
        if ("OPENPIX:CHARGE_EXPIRED".equals(event)) {
            repository.markPaymentExpired(orderId);
            return Response.ok(OrderResponse.success(orderId, "PAYMENT_EXPIRED")).build();
        }
        return Response.ok(OrderResponse.success(orderId, "IGNORED")).build();
    }

    private boolean isAuthorized(String authorizationHeader, String headerToken, String queryToken) {
        return webhookToken
                .filter(value -> !value.isBlank())
                .map(expected -> expected.equals(normalizeAuth(authorizationHeader))
                        || expected.equals(headerToken)
                        || expected.equals(queryToken))
                .orElse(true);
    }

    private boolean isOpenPixTestEvent(String event) {
        return "teste_webhook".equalsIgnoreCase(event) || "OPENPIX:TEST".equalsIgnoreCase(event);
    }

    private String normalizeAuth(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return trimmed.substring(7).trim();
        }
        return trimmed;
    }

    private String firstText(JsonNode node, String... paths) {
        for (String path : paths) {
            String value = text(node, path);
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String text(JsonNode node, String path) {
        JsonNode current = node;
        for (String name : path.split("\\.")) {
            current = current == null ? null : current.path(name);
        }
        return current == null || current.isMissingNode() || current.isNull() ? "" : current.asText("");
    }
}
