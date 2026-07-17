package com.becodapraia.orders;

import java.time.Instant;
import java.util.concurrent.ThreadLocalRandom;

public final class OrderPassword {
    private OrderPassword() {
    }

    public static String newOrderId() {
        return "B" + Instant.now().toEpochMilli() + "-" + newPassword();
    }

    public static String newPassword() {
        return "%03d".formatted(ThreadLocalRandom.current().nextInt(1000));
    }

    public static String fromOrderId(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return "";
        }
        String digits = orderId.replaceAll("\\D", "");
        if (digits.length() < 3) {
            return digits;
        }
        return digits.substring(digits.length() - 3);
    }
}
