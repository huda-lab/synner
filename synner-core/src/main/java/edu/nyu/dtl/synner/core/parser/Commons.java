package edu.nyu.dtl.synner.core.parser;

import com.fasterxml.jackson.databind.JsonNode;

public class Commons {

    private Commons() {}

    public static Comparable readValue(JsonNode element) {
        if (element.isNumber()) {
            return element.asDouble();
        } else if (element.isTextual()) { // we support only text
            return element.asText();
        } else if (element.isNull()) {
            return null;
        } else {
            throw new IllegalArgumentException("type not supported for element: " + element);
        }
    }

}
