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
            List<OrderItem> items,
            String totalText
    ) {
    }

    public record OrderItem(
            String name,
            String variant,
            Integer quantity,
            String unitPriceText,
            String notes
    ) {
    }

    public record OrderResponse(
            boolean ok,
            String orderId,
            String status,
            String error
    ) {
        public static OrderResponse success(String orderId, String status) {
            return new OrderResponse(true, orderId, status, null);
        }

        public static OrderResponse error(String error) {
            return new OrderResponse(false, null, null, error);
        }
    }

    public record OrderRecord(
            String orderId,
            String customerName,
            String paymentMethod,
            List<OrderItem> items,
            String totalText,
            BigDecimal totalAmount,
            String status,
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
