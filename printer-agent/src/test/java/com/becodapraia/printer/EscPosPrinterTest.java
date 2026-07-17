package com.becodapraia.printer;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.Charset;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertTrue;

class EscPosPrinterTest {
    @Test
    void sendsKitchenTicketToTcpPrinter() throws Exception {
        try (ServerSocket server = new ServerSocket(0)) {
            CompletableFuture<byte[]> received = CompletableFuture.supplyAsync(() -> capture(server));
            EscPosPrinter printer = new EscPosPrinter("127.0.0.1", server.getLocalPort());

            printer.print(new PrintOrder(
                    "B123",
                    "Douglas",
                    "Pix",
                    "LOCAL",
                    "04",
                    List.of(new PrintOrderItem("Trio Nordestino", "R$ 99,90", 1, "R$ 99,90",
                            List.of(
                                    new PrintOrderOption("Ponto da carne", "Ao ponto"),
                                    new PrintOrderOption("Acompanhamento", "Batata frita")
                            ),
                            "Sem cebola")),
                    "R$ 99,90",
                    "2026-07-09T12:00:00Z"
            ));

            String ticket = new String(received.get(5, TimeUnit.SECONDS), Charset.forName("CP850"));
            assertTrue(ticket.contains("BECO DA PRAIA"));
            assertTrue(ticket.contains("Pedido: B123"));
            assertTrue(ticket.contains("Consumo: Local"));
            assertTrue(ticket.contains("Mesa: 04"));
            assertTrue(ticket.contains("Pagamento: Pix"));
            assertTrue(ticket.contains("1x Trio Nordestino"));
            assertTrue(ticket.contains("Ponto da carne: Ao ponto"));
            assertTrue(ticket.contains("Acompanhamento: Batata frita"));
            assertTrue(ticket.contains("Obs: Sem cebola"));
            assertTrue(ticket.contains("Total: R$ 99,90"));
        }
    }

    private static byte[] capture(ServerSocket server) {
        try (Socket socket = server.accept(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[512];
            int read;
            while ((read = socket.getInputStream().read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
