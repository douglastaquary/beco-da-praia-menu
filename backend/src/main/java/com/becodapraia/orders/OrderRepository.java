package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.OrderItem;
import com.becodapraia.orders.OrderModels.OrderRecord;
import com.becodapraia.orders.OrderModels.PaymentDetails;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class OrderRepository {
    @ConfigProperty(name = "ORDERS_TABLE")
    String tableName;

    @Inject
    DynamoDbClient dynamoDb;

    @Inject
    ObjectMapper objectMapper;

    public void save(OrderRecord order) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("PK", s("ORDER#" + order.orderId()));
        item.put("SK", s("METADATA"));
        item.put("orderId", s(order.orderId()));
        item.put("customerName", s(order.customerName()));
        item.put("paymentMethod", s(order.paymentMethod()));
        item.put("consumptionType", s(order.consumptionType()));
        item.put("tableNumber", s(order.tableNumber()));
        item.put("itemsJson", s(toJson(order.items())));
        item.put("totalText", s(order.totalText()));
        item.put("totalAmount", AttributeValue.builder().n(order.totalAmount().toPlainString()).build());
        item.put("status", s(order.status()));
        putPayment(item, order.payment());
        item.put("createdAt", s(order.createdAt().toString()));
        item.put("updatedAt", s(order.updatedAt().toString()));
        item.put("printAttempts", AttributeValue.builder().n(Integer.toString(order.printAttempts())).build());
        dynamoDb.putItem(PutItemRequest.builder().tableName(tableName).item(item).build());
    }

    public Optional<OrderRecord> find(String orderId) {
        Map<String, AttributeValue> item = dynamoDb.getItem(GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("PK", s("ORDER#" + orderId), "SK", s("METADATA")))
                .build()).item();
        if (item == null || item.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(fromItem(item));
    }

    public void updateStatus(String orderId, String status, String message) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":status", s(status));
        values.put(":updatedAt", s(Instant.now().toString()));
        values.put(":message", s(message == null ? "" : message));
        dynamoDb.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("PK", s("ORDER#" + orderId), "SK", s("METADATA")))
                .updateExpression("SET #status = :status, updatedAt = :updatedAt, printMessage = :message")
                .expressionAttributeNames(Map.of("#status", "status"))
                .expressionAttributeValues(values)
                .build());
    }

    public void markPrintRequested(String orderId) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":status", s("PRINT_REQUESTED"));
        values.put(":updatedAt", s(Instant.now().toString()));
        values.put(":one", AttributeValue.builder().n("1").build());
        values.put(":zero", AttributeValue.builder().n("0").build());
        dynamoDb.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("PK", s("ORDER#" + orderId), "SK", s("METADATA")))
                .updateExpression("SET #status = :status, updatedAt = :updatedAt, printAttempts = if_not_exists(printAttempts, :zero) + :one")
                .expressionAttributeNames(Map.of("#status", "status"))
                .expressionAttributeValues(values)
                .build());
    }

    public boolean markPaidIfPending(String orderId) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":status", s("PAID"));
        values.put(":paymentStatus", s("PAID"));
        values.put(":updatedAt", s(Instant.now().toString()));
        values.put(":pending", s("PAYMENT_PENDING"));
        try {
            dynamoDb.updateItem(UpdateItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of("PK", s("ORDER#" + orderId), "SK", s("METADATA")))
                    .updateExpression("SET #status = :status, paymentStatus = :paymentStatus, updatedAt = :updatedAt")
                    .conditionExpression("#status = :pending")
                    .expressionAttributeNames(Map.of("#status", "status"))
                    .expressionAttributeValues(values)
                    .build());
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false;
        }
    }

    public void markPaymentExpired(String orderId) {
        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":status", s("PAYMENT_EXPIRED"));
        values.put(":paymentStatus", s("PAYMENT_EXPIRED"));
        values.put(":updatedAt", s(Instant.now().toString()));
        dynamoDb.updateItem(UpdateItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("PK", s("ORDER#" + orderId), "SK", s("METADATA")))
                .updateExpression("SET #status = :status, paymentStatus = :paymentStatus, updatedAt = :updatedAt")
                .expressionAttributeNames(Map.of("#status", "status"))
                .expressionAttributeValues(values)
                .build());
    }

    private AttributeValue s(String value) {
        return AttributeValue.builder().s(value == null ? "" : value).build();
    }

    private String toJson(List<OrderItem> items) {
        try {
            return objectMapper.writeValueAsString(items);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Nao foi possivel serializar itens do pedido.", e);
        }
    }

    private void putPayment(Map<String, AttributeValue> item, PaymentDetails payment) {
        if (payment == null) {
            return;
        }
        item.put("paymentProvider", s(payment.provider()));
        item.put("paymentStatus", s(payment.status()));
        item.put("paymentCorrelationId", s(payment.correlationId()));
        item.put("paymentTxId", s(payment.txId()));
        item.put("paymentBrCode", s(payment.brCode()));
        item.put("paymentQrCodeImage", s(payment.qrCodeImage()));
        item.put("paymentLinkUrl", s(payment.paymentLinkUrl()));
        if (payment.expiresAt() != null) {
            item.put("paymentExpiresAt", s(payment.expiresAt().toString()));
        }
    }

    private OrderRecord fromItem(Map<String, AttributeValue> item) {
        return new OrderRecord(
                string(item, "orderId"),
                string(item, "customerName"),
                string(item, "paymentMethod"),
                string(item, "consumptionType"),
                string(item, "tableNumber"),
                items(item),
                string(item, "totalText"),
                number(item, "totalAmount"),
                string(item, "status"),
                payment(item),
                instant(item, "createdAt"),
                instant(item, "updatedAt"),
                number(item, "printAttempts").intValue()
        );
    }

    private PaymentDetails payment(Map<String, AttributeValue> item) {
        String provider = string(item, "paymentProvider");
        if (provider.isBlank()) {
            return null;
        }
        return new PaymentDetails(
                provider,
                string(item, "paymentStatus"),
                string(item, "paymentCorrelationId"),
                string(item, "paymentTxId"),
                string(item, "paymentBrCode"),
                string(item, "paymentQrCodeImage"),
                string(item, "paymentLinkUrl"),
                instant(item, "paymentExpiresAt")
        );
    }

    private List<OrderItem> items(Map<String, AttributeValue> item) {
        try {
            return objectMapper.readValue(string(item, "itemsJson"), new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Nao foi possivel ler itens do pedido.", e);
        }
    }

    private String string(Map<String, AttributeValue> item, String name) {
        AttributeValue value = item.get(name);
        return value == null || value.s() == null ? "" : value.s();
    }

    private BigDecimal number(Map<String, AttributeValue> item, String name) {
        AttributeValue value = item.get(name);
        return value == null || value.n() == null ? BigDecimal.ZERO : new BigDecimal(value.n());
    }

    private Instant instant(Map<String, AttributeValue> item, String name) {
        String value = string(item, name);
        return value.isBlank() ? Instant.EPOCH : Instant.parse(value);
    }
}
