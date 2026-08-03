package com.becodapraia.printer;

public final class OrderPassword {
    private OrderPassword() {
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
