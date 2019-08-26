package edu.nyu.dtl.synner.core.infer;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.datamodel.ColumnType;

import java.util.List;

public class InferRequest {

    @JsonProperty
    String id;

    @JsonProperty("fieldname")
    String fieldName;

    @JsonProperty
    List<String> values;

    @JsonProperty
    String type; // column type (i.e. "string", "decimal", or "integer")

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFieldName() {
        return id;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public List<String> getValues() {
        return values;
    }

    public void setValues(List<String> values) {
        this.values = values;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public ColumnType getTypeAsColumnType() {
        return ColumnType.fromReadableName(type);
    }

    @Override
    public String toString() {
        return "{id='" + id + "\', values=" + values + "}";
    }
}
