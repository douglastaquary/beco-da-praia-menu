package com.becodapraia.printer;

public record PrinterAgentConfig(
        String iotEndpoint,
        String clientId,
        String ordersTopic,
        String statusTopic,
        String certPath,
        String privateKeyPath,
        String rootCaPath,
        String printerHost,
        int printerPort,
        String ordersApiBaseUrl
) {
    public static PrinterAgentConfig fromEnvironment() {
        return new PrinterAgentConfig(
                required("AWS_IOT_ENDPOINT"),
                required("AWS_IOT_CLIENT_ID"),
                value("AWS_IOT_TOPIC_ORDERS", "beco/printer/kitchen/orders"),
                value("AWS_IOT_TOPIC_STATUS", "beco/printer/kitchen/status"),
                required("AWS_IOT_CERT_PATH"),
                required("AWS_IOT_PRIVATE_KEY_PATH"),
                required("AWS_IOT_ROOT_CA_PATH"),
                required("PRINTER_HOST"),
                Integer.parseInt(value("PRINTER_PORT", "9100")),
                value("ORDERS_API_BASE_URL", "")
        );
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing environment variable: " + name);
        }
        return value;
    }

    private static String value(String name, String defaultValue) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? defaultValue : value;
    }
}
