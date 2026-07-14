package com.becodapraia.printer;

import java.util.List;

public record PrintOrderItem(
        String name,
        String variant,
        Integer quantity,
        String unitPriceText,
        List<PrintOrderOption> options,
        String notes
) {
}
