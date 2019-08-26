package edu.nyu.dtl.synner.core.datamodel;

public class StatusValue implements Comparable<StatusValue> {
    Comparable value;
    String status;

    public StatusValue(Comparable value, String status) {
        this.value = value;
        this.status = status;
    }

    public Comparable getValue() {
        return value;
    }

    public void setValue(Comparable value) {
        this.value = value;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public int compareTo(StatusValue o) {
        return value.compareTo(o.value);
    }
}
