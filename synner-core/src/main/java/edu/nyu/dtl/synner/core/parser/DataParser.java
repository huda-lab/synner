package edu.nyu.dtl.synner.core.parser;

import com.fasterxml.jackson.databind.JsonNode;
import edu.nyu.dtl.synner.core.datamodel.*;

import static edu.nyu.dtl.synner.core.parser.Commons.readValue;

public class DataParser {

    public DataParser() {

    }

    public GeneratedDataset readModel(Table table, JsonNode rootNode) {
        int toAdd = rootNode.has("to-add") ? rootNode.get("to-add").asInt() : 0;
        Comparable[][] tuples = readTuples(rootNode.get("tuples"));
        return new GeneratedDataset(table, tuples, toAdd);
    }

    private Comparable[][] readTuples(JsonNode jsonNode) {
        if (!jsonNode.isArray()) throw new IllegalArgumentException("the tuples field must be an array");
        Comparable[][] tuples = new Comparable[jsonNode.size()][];
        for (int i = 0; i < tuples.length; i++) {
            tuples[i] = readTuple(jsonNode.get(i));
        }
        return tuples;
    }

    private Comparable[] readTuple(JsonNode jsonNode) {
        if (!jsonNode.isArray()) throw new IllegalArgumentException("each tuple must be an array");
        Comparable[] tuple = new Comparable[jsonNode.size()];
        for (int i = 0; i < tuple.length; i++) {
            tuple[i] = readValue(jsonNode.get(i));
        }
        return tuple;
    }

}
