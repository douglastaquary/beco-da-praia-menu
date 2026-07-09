package com.becodapraia.printer;

public record PrintOrderItem(
        String name,
        String variant,
        Integer quantity,
        String unitPriceText,
        String notes
) {
}
