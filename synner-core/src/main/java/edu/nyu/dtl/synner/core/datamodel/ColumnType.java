package edu.nyu.dtl.synner.core.datamodel;

public enum ColumnType {
    INT("integer"),
    DEC("decimal"),
    STR("string"),
    DATE("date"),
    TIME("time");

    private final String readableName;

    ColumnType(String readableName) {
        this.readableName = readableName;
    }

    @Override
    public String toString() {
        return readableName;
    }

    public static ColumnType fromReadableName(String readableName) {
        switch (readableName) {
            case "integer":
                return ColumnType.INT;
            case "decimal":
                return ColumnType.DEC;
            case "string":
                return ColumnType.STR;
            case "date":
                return ColumnType.DATE;
            case "time":
                return ColumnType.TIME;
            default:
                throw new IllegalArgumentException("given type is not recognized");
        }
    }
}
