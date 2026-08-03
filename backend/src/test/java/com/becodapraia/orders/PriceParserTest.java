package com.becodapraia.orders;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PriceParserTest {
    private final PriceParser parser = new PriceParser();

    @Test
    void extractsFirstBrazilianCurrencyValue() {
        assertEquals(new BigDecimal("99.90"), parser.firstPrice("Serve 2 pessoas: R$ 99,90"));
    }

    @Test
    void handlesThousandSeparators() {
        assertEquals(new BigDecimal("1234.56"), parser.firstPrice("R$ 1.234,56"));
    }

    @Test
    void returnsZeroWhenNoPriceExists() {
        assertEquals(BigDecimal.ZERO, parser.firstPrice("Consulte disponibilidade"));
    }
}
