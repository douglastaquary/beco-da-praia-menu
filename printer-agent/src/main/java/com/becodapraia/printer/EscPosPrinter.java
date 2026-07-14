package com.becodapraia.printer;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

public class EscPosPrinter {
    private static final Charset PRINT_CHARSET = Charset.forName("CP850");

    private final String host;
    private final int port;

    public EscPosPrinter(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public void print(PrintOrder order) throws Exception {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 5_000);
            socket.setSoTimeout(10_000);
            OutputStream out = socket.getOutputStream();
            out.write(new byte[]{0x1B, 0x40});
            out.write(new byte[]{0x1B, 0x61, 0x01});
            write(out, "BECO DA PRAIA\n");
            write(out, "PEDIDO COZINHA\n");
            write(out, "------------------------------\n");
            out.write(new byte[]{0x1B, 0x61, 0x00});
            write(out, "Pedido: " + safe(order.orderId()) + "\n");
            write(out, "Cliente: " + safe(order.customerName()) + "\n");
            write(out, "Pagamento: " + safe(order.paymentMethod()) + "\n");
            write(out, "Data: " + safe(order.createdAt()) + "\n");
            write(out, "------------------------------\n");
            if (order.items() != null) {
                for (PrintOrderItem item : order.items()) {
                    int quantity = item.quantity() == null ? 1 : item.quantity();
                    write(out, quantity + "x " + safe(item.name()) + "\n");
                    if (!isBlank(item.variant())) {
                        write(out, "   Opcao: " + item.variant() + "\n");
                    }
                    if (item.options() != null) {
                        for (PrintOrderOption option : item.options()) {
                            if (option != null && !isBlank(option.name()) && !isBlank(option.value())) {
                                write(out, "   " + option.name() + ": " + option.value() + "\n");
                            }
                        }
                    }
                    if (!isBlank(item.notes())) {
                        write(out, "   Obs: " + item.notes() + "\n");
                    }
                    write(out, "   " + safe(item.unitPriceText()) + "\n");
                }
            }
            write(out, "------------------------------\n");
            write(out, "Total: " + safe(order.totalText()) + "\n\n\n");
            out.write(new byte[]{0x1D, 0x56, 0x42, 0x00});
            out.flush();
        }
    }

    private void write(OutputStream out, String value) throws Exception {
        out.write(value.getBytes(PRINT_CHARSET));
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
