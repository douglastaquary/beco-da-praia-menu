package com.becodapraia.orders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderModels {
    private OrderModels() {
    }

    public record CreateOrderRequest(
            String customerName,
            String paymentMethod,
            String consumptionType,
            String tableNumber,
            List<OrderItem> items,
            String totalText
    ) {
    }

    public record OrderItem(
            String name,
            String variant,
            Integer quantity,
            String unitPriceText,
            List<OrderOption> options,
            String notes
    ) {
    }

    public record OrderOption(
            String name,
            String value
    ) {
    }

    public record OrderResponse(
            boolean ok,
            String orderId,
            String status,
            PaymentDetails payment,
            String error
    ) {
        public static OrderResponse success(String orderId, String status) {
            return new OrderResponse(true, orderId, status, null, null);
        }

        public static OrderResponse success(String orderId, String status, PaymentDetails payment) {
            return new OrderResponse(true, orderId, status, payment, null);
        }

        public static OrderResponse error(String error) {
            return new OrderResponse(false, null, null, null, error);
        }
    }

    public record PaymentDetails(
            String provider,
            String status,
            String correlationId,
            String txId,
            String brCode,
            String qrCodeImage,
            String paymentLinkUrl,
            Instant expiresAt
    ) {
    }

    public record OrderRecord(
            String orderId,
            String customerName,
            String paymentMethod,
            String consumptionType,
            String tableNumber,
            List<OrderItem> items,
            String totalText,
            BigDecimal totalAmount,
            String status,
            PaymentDetails payment,
            Instant createdAt,
            Instant updatedAt,
            int printAttempts
    ) {
    }

    public record PrintStatusRequest(
            String orderId,
            String status,
            String message
    ) {
    }
}
