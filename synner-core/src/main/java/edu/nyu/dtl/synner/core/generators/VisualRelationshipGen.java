package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;

public class VisualRelationshipGen implements Generator<Comparable> {

    @JsonProperty
    private final int inputFieldIdx;

    @JsonProperty
    private double[] in = null;

    @JsonProperty
    private double[] out = null;

    @JsonProperty(value = "in-min")
    private double inMin;

    @JsonProperty(value = "in-max")
    private double inMax;

    @JsonProperty(value = "out-min")
    private double outMin;

    @JsonProperty(value = "out-max")
    private double outMax;

    @JsonProperty(value = "noises")
    private double noises;

    @JsonProperty
    private Approximation approximation; // called

    public VisualRelationshipGen(int inputFieldIdx, double[] in, double[] out, double inMin, double inMax, double outMin, double outMax, Approximation approximation, double noises) {
        this.inputFieldIdx = inputFieldIdx;
        this.in = in;
        this.out = out;
        this.inMin = inMin;
        this.inMax = inMax;
        this.outMin = outMin;
        this.outMax = outMax;
        this.approximation = approximation;
        this.noises = noises;
    }

    @Override
    public Comparable generate(boolean errorMode, boolean previewMode) {
        throw new RuntimeException("Method not implemented");
    }

    private Comparable denormalizeOut(double value) {
        return value * (outMax - outMin) + outMin;
    }

    private double normalizeIn(double value) {
        return (value - inMin) / (inMax - inMin);
    }


    private double introduceNoises(double value) {
        return value + rnd.nextGaussian() * noises;
    }

    @Override
    public Comparable generate(Comparable[] inputs, boolean errorMode, boolean previewMode) {
        if (inputs == null || inputs[inputFieldIdx] == null) throw new NullPointerException();
        if (!(inputs[inputFieldIdx] instanceof Number))
            throw new IllegalArgumentException("interpolate is not possible without numeric values");

        if (errorMode) {
            if (rnd.nextBoolean()) {
                return outMin - rnd.nextInt((int) (outMax - outMin));
            } else {
                return outMax + rnd.nextInt((int) (outMax - outMin));
            }
        }

        double input = normalizeIn(((Number) inputs[inputFieldIdx]).doubleValue());
        int pos = Arrays.binarySearch(in, input);
        double normalizedRes;
        if (pos >= 0) normalizedRes = out[pos];
        else {
            int lowPos = -pos - 2;
            int hiPos = -pos - 1;
            if (lowPos < 0) return outMin;
            if (hiPos >= in.length) return outMax;
            switch (approximation) {
                case interpolate:
                case nearer:
                    double relPos = (input - in[lowPos]) / (in[hiPos] - in[lowPos]);

                    if (approximation == Approximation.interpolate) {
                        normalizedRes = (out[hiPos] - out[lowPos]) * relPos + out[lowPos];
                    } else { // nearer
                        normalizedRes = out[lowPos + (int) Math.round(relPos)];
                    }
                    break;
                case low:
                    normalizedRes = out[lowPos];
                    break;
                case high:
                    normalizedRes = out[hiPos];
                    break;
                default:
                    throw new IllegalArgumentException("approximation constant not correctly defined");
            }
        }

        double v = introduceNoises(normalizedRes);

//        if (v < 0) v = 0;
//        else if (v > 1) v = 1;

        return denormalizeOut(v);
    }

    public enum Approximation {
        interpolate,
        nearer,
        low,
        high
    }

}
