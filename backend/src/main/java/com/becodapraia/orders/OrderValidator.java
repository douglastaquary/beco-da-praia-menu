package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.CreateOrderRequest;
import com.becodapraia.orders.OrderModels.OrderItem;
import com.becodapraia.orders.OrderModels.OrderOption;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class OrderValidator {
    public List<String> validate(CreateOrderRequest request) {
        List<String> errors = new ArrayList<>();
        if (request == null) {
            errors.add("Pedido vazio.");
            return errors;
        }
        if (isBlank(request.paymentMethod())) {
            errors.add("Informe a forma de pagamento.");
        } else if (!"pix".equalsIgnoreCase(request.paymentMethod().trim())) {
            errors.add("Pedidos online aceitam somente pagamento via Pix.");
        }
        String consumptionType = normalize(request.consumptionType());
        if (!"LOCAL".equals(consumptionType) && !"TAKEAWAY".equals(consumptionType)) {
            errors.add("Informe se o pedido e para comer no local ou viagem.");
        } else if ("LOCAL".equals(consumptionType) && isBlank(request.tableNumber())) {
            errors.add("Informe a mesa para comer no local.");
        } else if ("TAKEAWAY".equals(consumptionType) && isBlank(request.customerName())) {
            errors.add("Informe o nome para retirada.");
        }
        if (request.items() == null || request.items().isEmpty()) {
            errors.add("Inclua pelo menos um item no pedido.");
            return errors;
        }
        for (OrderItem item : request.items()) {
            if (item == null || isBlank(item.name())) {
                errors.add("Item sem nome.");
                continue;
            }
            if (item.quantity() == null || item.quantity() < 1 || item.quantity() > 99) {
                errors.add("Quantidade invalida para " + item.name() + ".");
            }
            if (isBlank(item.unitPriceText()) || !item.unitPriceText().contains("R$")) {
                errors.add("Preco invalido para " + item.name() + ".");
            }
            if (item.options() != null) {
                for (OrderOption option : item.options()) {
                    if (option == null || isBlank(option.name()) || isBlank(option.value())) {
                        errors.add("Opcional invalido para " + item.name() + ".");
                    }
                }
            }
        }
        return errors;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}
