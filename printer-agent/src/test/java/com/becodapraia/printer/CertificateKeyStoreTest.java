package com.becodapraia.printer;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CertificateKeyStoreTest {
    @Test
    void normalizeEndpointStripsProtocolAndPath() {
        assertEquals(
                "abc123-ats.iot.us-east-1.amazonaws.com",
                CertificateKeyStore.normalizeEndpoint("https://abc123-ats.iot.us-east-1.amazonaws.com/"));
        assertEquals(
                "abc123-ats.iot.us-east-1.amazonaws.com",
                CertificateKeyStore.normalizeEndpoint("abc123-ats.iot.us-east-1.amazonaws.com"));
    }
}
