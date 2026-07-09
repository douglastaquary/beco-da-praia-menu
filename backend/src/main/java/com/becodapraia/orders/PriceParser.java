package com.becodapraia.orders;

import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ApplicationScoped
public class PriceParser {
    private static final Pattern BRL = Pattern.compile("R\\$\\s*([0-9.]+,[0-9]{2})");

    public BigDecimal firstPrice(String value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        Matcher matcher = BRL.matcher(value);
        if (!matcher.find()) {
            return BigDecimal.ZERO;
        }
        String normalized = matcher.group(1).replace(".", "").replace(",", ".");
        return new BigDecimal(normalized);
    }
}
