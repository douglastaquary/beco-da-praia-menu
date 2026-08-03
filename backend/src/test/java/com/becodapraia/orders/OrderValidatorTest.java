package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.CreateOrderRequest;
import com.becodapraia.orders.OrderModels.OrderItem;
import com.becodapraia.orders.OrderModels.OrderOption;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderValidatorTest {
    private final OrderValidator validator = new OrderValidator();

    @Test
    void acceptsValidOrder() {
        CreateOrderRequest request = new CreateOrderRequest(
                "Douglas",
                "Pix",
                "LOCAL",
                "04",
                List.of(new OrderItem("Baiao de Dois", "R$ 87,00", 2, "R$ 87,00", List.of(), "")),
                "R$ 174,00"
        );

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void rejectsMissingCustomerPaymentAndItems() {
        CreateOrderRequest request = new CreateOrderRequest("", "", "", "", List.of(), "R$ 0,00");

        List<String> errors = validator.validate(request);

        assertEquals(3, errors.size());
        assertTrue(errors.contains("Informe a forma de pagamento."));
        assertTrue(errors.contains("Informe se o pedido e para comer no local ou viagem."));
        assertTrue(errors.contains("Inclua pelo menos um item no pedido."));
    }

    @Test
    void rejectsNonPixPayment() {
        CreateOrderRequest request = new CreateOrderRequest(
                "Douglas",
                "Cartao de credito",
                "TAKEAWAY",
                "",
                List.of(new OrderItem("Torresmo", "R$ 10,00", 1, "R$ 10,00", List.of(), "")),
                "R$ 10,00"
        );

        List<String> errors = validator.validate(request);

        assertEquals(1, errors.size());
        assertTrue(errors.contains("Pedidos online aceitam somente pagamento via Pix."));
    }

    @Test
    void rejectsLocalOrderWithoutTable() {
        CreateOrderRequest request = new CreateOrderRequest(
                "",
                "Pix",
                "LOCAL",
                "",
                List.of(new OrderItem("Dadinho de tapioca", "R$ 27,00", 1, "R$ 27,00", List.of(), "")),
                "R$ 27,00"
        );

        List<String> errors = validator.validate(request);

        assertEquals(1, errors.size());
        assertTrue(errors.contains("Informe a mesa para comer no local."));
    }

    @Test
    void rejectsTakeawayOrderWithoutName() {
        CreateOrderRequest request = new CreateOrderRequest(
                "",
                "Pix",
                "TAKEAWAY",
                "",
                List.of(new OrderItem("Dadinho de tapioca", "R$ 27,00", 1, "R$ 27,00", List.of(), "")),
                "R$ 27,00"
        );

        List<String> errors = validator.validate(request);

        assertEquals(1, errors.size());
        assertTrue(errors.contains("Informe o nome para retirada."));
    }

    @Test
    void rejectsInvalidItemQuantityAndPrice() {
        CreateOrderRequest request = new CreateOrderRequest(
                "Douglas",
                "Pix",
                "TAKEAWAY",
                "",
                List.of(new OrderItem("Torresmo", "UNID", 0, "UNID", List.of(), "")),
                "R$ 0,00"
        );

        List<String> errors = validator.validate(request);

        assertEquals(2, errors.size());
        assertTrue(errors.get(0).contains("Quantidade invalida"));
        assertTrue(errors.get(1).contains("Preco invalido"));
    }

    @Test
    void rejectsInvalidItemOptions() {
        CreateOrderRequest request = new CreateOrderRequest(
                "Douglas",
                "Pix",
                "TAKEAWAY",
                "",
                List.of(new OrderItem("Mix de churrasco", "INTEIRA: R$ 95,00", 1, "INTEIRA: R$ 95,00",
                        List.of(new OrderOption("Ponto da carne", "")), "")),
                "R$ 95,00"
        );

        List<String> errors = validator.validate(request);

        assertEquals(1, errors.size());
        assertTrue(errors.get(0).contains("Opcional invalido"));
    }
}
