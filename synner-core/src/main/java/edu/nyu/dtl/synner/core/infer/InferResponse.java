package edu.nyu.dtl.synner.core.infer;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

public class InferResponse {

    @JsonProperty
    String id;

    @JsonProperty
    List<String> values;

    @JsonProperty("inferred-types")
    List<InferType> inferredTypes = new ArrayList<>();

    @JsonProperty("examples")
    List<List<String>> examples = new ArrayList<>();

    public InferResponse(InferRequest req) {
        this.id = req.id;
        this.values = new ArrayList<>(req.values);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<String> getValues() {
        return values;
    }

    public void setValues(List<String> values) {
        this.values = values;
    }

    public List<InferType> getInferredTypes() {
        return inferredTypes;
    }

    public void setInferredTypes(List<InferType> inferredTypes) {
        this.inferredTypes = inferredTypes;
    }

    @Override
    public String toString() {
        return "{id='" + id + "\', values=" + values + ", inferredTypes=" + inferredTypes + ", examples=" + examples + "}";
    }

}
