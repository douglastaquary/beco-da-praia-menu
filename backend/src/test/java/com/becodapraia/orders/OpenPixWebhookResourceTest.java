package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.OrderItem;
import com.becodapraia.orders.OrderModels.OrderRecord;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenPixWebhookResourceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void paidWebhookPublishesOrderOnlyOnce() throws Exception {
        FakeOrderRepository repository = new FakeOrderRepository();
        FakePrintPublisher publisher = new FakePrintPublisher();
        OpenPixWebhookResource resource = new OpenPixWebhookResource();
        resource.repository = repository;
        resource.printPublisher = publisher;
        resource.webhookToken = Optional.empty();

        Response first = resource.receive(objectMapper.readTree("""
                {"event":"OPENPIX:CHARGE_COMPLETED","charge":{"correlationID":"B123"}}
                """), null, null);
        Response duplicate = resource.receive(objectMapper.readTree("""
                {"event":"OPENPIX:CHARGE_COMPLETED","charge":{"correlationID":"B123"}}
                """), null, null);

        assertEquals(200, first.getStatus());
        assertEquals(200, duplicate.getStatus());
        assertEquals(1, publisher.publishCount);
        assertEquals(1, repository.printRequestedCount);
    }

    @Test
    void expiredWebhookDoesNotPublishOrder() throws Exception {
        FakeOrderRepository repository = new FakeOrderRepository();
        FakePrintPublisher publisher = new FakePrintPublisher();
        OpenPixWebhookResource resource = new OpenPixWebhookResource();
        resource.repository = repository;
        resource.printPublisher = publisher;
        resource.webhookToken = Optional.empty();

        Response response = resource.receive(objectMapper.readTree("""
                {"event":"OPENPIX:CHARGE_EXPIRED","charge":{"correlationID":"B123"}}
                """), null, null);

        assertEquals(200, response.getStatus());
        assertEquals("PAYMENT_EXPIRED", repository.status);
        assertEquals(0, publisher.publishCount);
    }

    static class FakeOrderRepository extends OrderRepository {
        String status = "PAYMENT_PENDING";
        int printRequestedCount;

        @Override
        public Optional<OrderRecord> find(String orderId) {
            return Optional.of(new OrderRecord(
                    orderId,
                    "Douglas",
                    "Pix",
                    "TAKEAWAY",
                    "",
                    List.of(new OrderItem("Baiao de Dois", "R$ 87,00", 1, "R$ 87,00", List.of(), "")),
                    "R$ 87,00",
                    BigDecimal.valueOf(87),
                    status,
                    null,
                    Instant.now(),
                    Instant.now(),
                    printRequestedCount
            ));
        }

        @Override
        public boolean markPaidIfPending(String orderId) {
            if (!"PAYMENT_PENDING".equals(status)) {
                return false;
            }
            status = "PAID";
            return true;
        }

        @Override
        public void markPrintRequested(String orderId) {
            status = "PRINT_REQUESTED";
            printRequestedCount++;
        }

        @Override
        public void markPaymentExpired(String orderId) {
            status = "PAYMENT_EXPIRED";
        }
    }

    static class FakePrintPublisher extends PrintPublisher {
        int publishCount;

        @Override
        public void publish(OrderRecord order) {
            publishCount++;
        }
    }
}
