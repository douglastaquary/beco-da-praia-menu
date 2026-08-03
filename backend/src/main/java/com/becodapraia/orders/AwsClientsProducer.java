package com.becodapraia.orders;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.iotdataplane.IotDataPlaneClient;
import software.amazon.awssdk.services.iotdataplane.IotDataPlaneClientBuilder;

import java.net.URI;
import java.util.Optional;

@ApplicationScoped
public class AwsClientsProducer {
    @ConfigProperty(name = "IOT_DATA_ENDPOINT")
    Optional<String> iotDataEndpoint;

    @Produces
    @ApplicationScoped
    DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder()
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    @Produces
    @ApplicationScoped
    IotDataPlaneClient iotDataPlaneClient() {
        IotDataPlaneClientBuilder builder = IotDataPlaneClient.builder()
                .httpClientBuilder(UrlConnectionHttpClient.builder());
        iotDataEndpoint.filter(value -> !value.isBlank())
                .ifPresent(value -> builder.endpointOverride(URI.create(value)));
        return builder.build();
    }
}
