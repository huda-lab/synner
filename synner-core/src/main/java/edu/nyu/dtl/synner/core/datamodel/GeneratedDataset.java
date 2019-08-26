package edu.nyu.dtl.synner.core.datamodel;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

public class GeneratedDataset {
    private final Table table;
    private final Comparable[][] prefillData;
    private final int toAdd;

    private DataField[][] data;

    public GeneratedDataset(Table table,  Comparable[][] prefillData, int toAdd) {
        if (toAdd < 0) throw new IllegalArgumentException("the number of tuples to add must be a positive number");
        this.table = table;
        this.prefillData = prefillData;
        this.toAdd = toAdd;
    }

    public void generate(boolean previewMode) throws Exception {
        int colNum = table.getColumnsNumber();
        data = new DataField[prefillData.length + toAdd][];
        for (int rowIdx = 0; rowIdx < data.length; rowIdx++) {
            Comparable[] tuple = new Comparable[colNum];
            if (rowIdx < prefillData.length) {
                for (int j = 0; j < prefillData[rowIdx].length; j++) tuple[j] = prefillData[rowIdx][j];
            }
            table.generateTuple(tuple, previewMode);
            data[rowIdx] = new DataField[colNum];
            for (int j = 0; j < colNum; j++) {
                boolean generated = rowIdx >= prefillData.length || prefillData[rowIdx][j] == null;
                if (tuple[j] instanceof StatusValue) {
                    StatusValue sv = (StatusValue) tuple[j];
                    data[rowIdx][j] = new DataField(sv.getValue(), generated, sv.getStatus());
                } else {
                    data[rowIdx][j] = new DataField(tuple[j], generated);
                }
            }
        }
    }

    @JsonProperty
    public DataField[][] getData() {
        return data;
    }

    /**
     * Store a value, which can be generated or given as input.
     * It could also store other information in the future, such as path used to generate data, or errors notifications.
     */
    public static class DataField {

        @JsonProperty("v")
        public final Comparable data;

        @JsonProperty("g")
        public final boolean generated;

        @JsonProperty("s")
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public final String status;

        public DataField(Comparable data, boolean generated, String status) {
            this.data = data;
            this.generated = generated;
            this.status = status;
        }

        public DataField(Comparable data, boolean generated) {
            this(data, generated, null);
        }

        @Override
        public String toString() {
            StringBuilder sb = new StringBuilder();
            sb.append("{v:");
            sb.append(",g:");
            sb.append(generated);
            if (this.status != null) {
                sb.append(",s:");
                sb.append(this.status);
            }
            sb.append("}");
            return sb.toString();
        }
    }
}
