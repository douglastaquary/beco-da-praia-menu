package com.becodapraia.printer;

import java.util.List;

public record PrintOrder(
        String orderId,
        String customerName,
        String paymentMethod,
        String consumptionType,
        String tableNumber,
        List<PrintOrderItem> items,
        String totalText,
        String createdAt
) {
}
