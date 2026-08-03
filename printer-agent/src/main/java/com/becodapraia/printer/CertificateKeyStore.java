package com.becodapraia.printer;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.spec.KeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPrivateCrtKeySpec;
import java.util.Base64;
import java.util.Collection;

/**
 * Loads an X.509 device certificate and PEM private key into a Java KeyStore
 * for AWS IoT MQTT mutual TLS.
 */
final class CertificateKeyStore {
    private CertificateKeyStore() {
    }

    record KeyStorePasswordPair(KeyStore keyStore, String keyPassword) {
    }

    static KeyStorePasswordPair fromPemFiles(String certificateFile, String privateKeyFile) {
        try {
            PrivateKey privateKey = loadPrivateKey(privateKeyFile);
            Certificate[] chain = loadCertificates(certificateFile);
            KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(null);
            String keyPassword = new BigInteger(128, new SecureRandom()).toString(32);
            keyStore.setKeyEntry("alias", privateKey, keyPassword.toCharArray(), chain);
            return new KeyStorePasswordPair(keyStore, keyPassword);
        } catch (GeneralSecurityException | IOException e) {
            throw new IllegalStateException(
                    "Nao foi possivel carregar certificado/chave IoT: " + e.getMessage(), e);
        }
    }

    static String normalizeEndpoint(String endpoint) {
        if (endpoint == null) {
            return "";
        }
        String value = endpoint.trim();
        value = value.replaceFirst("(?i)^https?://", "");
        int slash = value.indexOf('/');
        if (slash >= 0) {
            value = value.substring(0, slash);
        }
        return value;
    }

    private static Certificate[] loadCertificates(String filename) throws GeneralSecurityException, IOException {
        try (BufferedInputStream stream = new BufferedInputStream(new FileInputStream(filename))) {
            CertificateFactory factory = CertificateFactory.getInstance("X.509");
            Collection<? extends Certificate> certificates = factory.generateCertificates(stream);
            if (certificates == null || certificates.isEmpty()) {
                throw new IllegalStateException("Certificado IoT vazio: " + filename);
            }
            return certificates.toArray(Certificate[]::new);
        }
    }

    private static PrivateKey loadPrivateKey(String filename) throws GeneralSecurityException, IOException {
        StringBuilder builder = new StringBuilder();
        boolean inKey = false;
        boolean isRsaPkcs1 = false;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(filename), StandardCharsets.UTF_8))) {
            for (String line = reader.readLine(); line != null; line = reader.readLine()) {
                if (!inKey) {
                    if (line.startsWith("-----BEGIN ") && line.endsWith(" PRIVATE KEY-----")) {
                        inKey = true;
                        isRsaPkcs1 = line.contains("RSA");
                    }
                    continue;
                }
                if (line.startsWith("-----END ") && line.endsWith(" PRIVATE KEY-----")) {
                    break;
                }
                builder.append(line.trim());
            }
        }
        if (builder.length() == 0) {
            throw new IllegalStateException("Chave privada IoT invalida: " + filename);
        }
        byte[] encoded = Base64.getDecoder().decode(builder.toString());
        KeySpec keySpec = isRsaPkcs1 ? rsaPrivateCrtKeySpec(encoded) : new PKCS8EncodedKeySpec(encoded);
        return KeyFactory.getInstance("RSA").generatePrivate(keySpec);
    }

    private static RSAPrivateCrtKeySpec rsaPrivateCrtKeySpec(byte[] keyBytes) throws IOException {
        DerParser parser = new DerParser(keyBytes);
        Asn1Object sequence = parser.read();
        if (sequence.type != DerParser.SEQUENCE) {
            throw new IOException("Invalid DER: not a sequence");
        }
        parser = sequence.getParser();
        parser.read();
        BigInteger modulus = parser.read().getInteger();
        BigInteger publicExp = parser.read().getInteger();
        BigInteger privateExp = parser.read().getInteger();
        BigInteger prime1 = parser.read().getInteger();
        BigInteger prime2 = parser.read().getInteger();
        BigInteger exp1 = parser.read().getInteger();
        BigInteger exp2 = parser.read().getInteger();
        BigInteger crtCoef = parser.read().getInteger();
        return new RSAPrivateCrtKeySpec(modulus, publicExp, privateExp, prime1, prime2, exp1, exp2, crtCoef);
    }

    private static final class DerParser {
        static final int CONSTRUCTED = 0x20;
        static final int INTEGER = 0x02;
        static final int SEQUENCE = 0x10;

        private final InputStream in;

        DerParser(byte[] bytes) {
            this.in = new ByteArrayInputStream(bytes);
        }

        DerParser(InputStream in) {
            this.in = in;
        }

        Asn1Object read() throws IOException {
            int tag = in.read();
            if (tag == -1) {
                throw new IOException("Invalid DER: stream too short, missing tag");
            }
            int length = readLength();
            byte[] value = in.readNBytes(length);
            if (value.length < length) {
                throw new IOException("Invalid DER: stream too short, missing value");
            }
            return new Asn1Object(tag, value);
        }

        private int readLength() throws IOException {
            int first = in.read();
            if (first == -1) {
                throw new IOException("Invalid DER: length missing");
            }
            if ((first & ~0x7F) == 0) {
                return first;
            }
            int num = first & 0x7F;
            if (num == 0 || num > 4) {
                throw new IOException("Invalid DER: length field too big");
            }
            byte[] bytes = in.readNBytes(num);
            if (bytes.length < num) {
                throw new IOException("Invalid DER: length too short");
            }
            return new BigInteger(1, bytes).intValue();
        }
    }

    private static final class Asn1Object {
        private final int tag;
        private final int type;
        private final byte[] value;

        Asn1Object(int tag, byte[] value) {
            this.tag = tag;
            this.type = tag & 0x1F;
            this.value = value;
        }

        boolean isConstructed() {
            return (tag & DerParser.CONSTRUCTED) == DerParser.CONSTRUCTED;
        }

        DerParser getParser() throws IOException {
            if (!isConstructed()) {
                throw new IOException("Invalid DER: can't parse primitive entity");
            }
            return new DerParser(value);
        }

        BigInteger getInteger() throws IOException {
            if (type != DerParser.INTEGER) {
                throw new IOException("Invalid DER: object is not integer");
            }
            return new BigInteger(value);
        }
    }
}
