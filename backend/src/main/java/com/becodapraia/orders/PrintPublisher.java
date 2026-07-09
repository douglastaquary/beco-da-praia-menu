package com.becodapraia.orders;

import com.becodapraia.orders.OrderModels.OrderRecord;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.iotdataplane.IotDataPlaneClient;
import software.amazon.awssdk.services.iotdataplane.model.PublishRequest;

import java.util.Map;

@ApplicationScoped
public class PrintPublisher {
    @ConfigProperty(name = "PRINTER_ORDERS_TOPIC", defaultValue = "beco/printer/kitchen/orders")
    String ordersTopic;

    @Inject
    IotDataPlaneClient iot;

    @Inject
    ObjectMapper objectMapper;

    public void publish(OrderRecord order) {
        try {
            byte[] payload = objectMapper.writeValueAsBytes(Map.of(
                    "orderId", order.orderId(),
                    "customerName", order.customerName(),
                    "paymentMethod", order.paymentMethod(),
                    "items", order.items(),
                    "totalText", order.totalText(),
                    "createdAt", order.createdAt().toString()
            ));
            iot.publish(PublishRequest.builder()
                    .topic(ordersTopic)
                    .qos(1)
                    .payload(SdkBytes.fromByteArray(payload))
                    .build());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Nao foi possivel publicar pedido para impressao.", e);
        }
    }
}
