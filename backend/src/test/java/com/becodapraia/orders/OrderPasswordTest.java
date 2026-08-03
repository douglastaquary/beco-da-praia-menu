package com.becodapraia.orders;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderPasswordTest {
    @Test
    void createsOrderIdEndingWithThreeDigits() {
        String orderId = OrderPassword.newOrderId();

        assertTrue(orderId.matches("^B\\d+-\\d{3}$"));
    }

    @Test
    void extractsLastThreeDigitsFromOrderId() {
        assertEquals("123", OrderPassword.fromOrderId("B1752607100000-123"));
        assertEquals("789", OrderPassword.fromOrderId("B1752607100000-A7B8C9"));
    }
}
