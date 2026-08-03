package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.CreateOrderRequest;
import com.becodapraia.orders.OrderModels.OrderItem;
import com.becodapraia.orders.OrderModels.OrderRecord;
import com.becodapraia.orders.OrderModels.OrderResponse;
import com.becodapraia.orders.OrderModels.PaymentDetails;
import com.becodapraia.orders.OrderModels.PrintStatusRequest;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {
    @Inject
    OrderValidator validator;

    @Inject
    PriceParser priceParser;

    @Inject
    OrderRepository repository;

    @Inject
    PrintPublisher printPublisher;

    @Inject
    OpenPixClient openPixClient;

    @POST
    public Response create(CreateOrderRequest request) {
        List<String> errors = validator.validate(request);
        if (!errors.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(OrderResponse.error(String.join(" ", errors)))
                    .build();
        }

        String orderId = newOrderId();
        Instant now = Instant.now();
        BigDecimal total = request.items().stream()
                .map(this::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean pixPayment = isPix(request.paymentMethod());
        String customerName = clean(request.customerName());
        String payerName = customerName.isBlank() ? "Mesa " + clean(request.tableNumber()) : customerName;
        PaymentDetails payment;
        try {
            payment = pixPayment
                    ? openPixClient.createCharge(orderId, total, payerName)
                    : null;
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(OrderResponse.error(e.getMessage()))
                    .build();
        }
        OrderRecord order = new OrderRecord(
                orderId,
                customerName,
                request.paymentMethod().trim(),
                clean(request.consumptionType()).toUpperCase(),
                clean(request.tableNumber()),
                request.items(),
                request.totalText(),
                total,
                pixPayment ? "PAYMENT_PENDING" : "RECEIVED",
                payment,
                now,
                now,
                0
        );

        repository.save(order);
        if (!pixPayment) {
            printPublisher.publish(order);
            repository.markPrintRequested(orderId);
        }

        return Response.status(Response.Status.CREATED)
                .entity(OrderResponse.success(orderId, pixPayment ? "PAYMENT_PENDING" : "PRINT_REQUESTED", payment))
                .build();
    }

    @GET
    @Path("/{orderId}")
    public Response find(@PathParam("orderId") String orderId) {
        Optional<OrderRecord> order = repository.find(orderId);
        if (order.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(OrderResponse.error("Pedido nao encontrado."))
                    .build();
        }
        return Response.ok(order.get()).build();
    }

    @POST
    @Path("/{orderId}/reprint")
    public Response reprint(@PathParam("orderId") String orderId) {
        Optional<OrderRecord> order = repository.find(orderId);
        if (order.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(OrderResponse.error("Pedido nao encontrado."))
                    .build();
        }
        printPublisher.publish(order.get());
        repository.markPrintRequested(orderId);
        return Response.accepted(OrderResponse.success(orderId, "PRINT_REQUESTED")).build();
    }

    @POST
    @Path("/{orderId}/print-status")
    public Response printStatus(@PathParam("orderId") String orderId, PrintStatusRequest request) {
        String status = request != null && request.status() != null ? request.status() : "PRINT_FAILED";
        String normalized = "PRINTED".equals(status) ? "PRINTED" : "PRINT_FAILED";
        repository.updateStatus(orderId, normalized, request == null ? "" : request.message());
        return Response.ok(OrderResponse.success(orderId, normalized)).build();
    }

    private BigDecimal lineTotal(OrderItem item) {
        return priceParser.firstPrice(item.unitPriceText()).multiply(BigDecimal.valueOf(item.quantity()));
    }

    private String newOrderId() {
        return OrderPassword.newOrderId();
    }

    private boolean isPix(String paymentMethod) {
        return paymentMethod != null && "pix".equalsIgnoreCase(paymentMethod.trim());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

}
