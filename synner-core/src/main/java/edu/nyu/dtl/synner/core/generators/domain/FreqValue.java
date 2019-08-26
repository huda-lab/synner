package edu.nyu.dtl.synner.core.generators.domain;

public class FreqValue {
    private int freq;
    private String value;

    public FreqValue(int freq, String value) {
        this.freq = freq;
        this.value = value;
    }

    public int getFreq() {
        return freq;
    }

    public void setFreq(int freq) {
        this.freq = freq;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    @Override
    public String toString() {
        return freq + ", " + value;
    }
}
