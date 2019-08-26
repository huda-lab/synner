package edu.nyu.dtl.synner.core.generators.numerical;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import edu.nyu.dtl.synner.core.generators.Generator;

@JsonPropertyOrder({"type", "histogram", "min", "max"})
public class CustomGen implements Generator<Double> {

    @JsonProperty
    private Double[] normalizedHistogram;
    private Double[] minValues;
    private Double[] maxValues;
    private double min;
    private double max;

    public CustomGen(Double[] histogram, double min, double max) {
        if (max < min) throw new IllegalArgumentException("custom max less than min");
        this.min = min;
        this.max = max;
        this.normalizedHistogram = new Double[histogram.length];
        double sum = 0;

        for (Double histogramValue : histogram) {
            sum += histogramValue;
        }
        for (int i = 0; i < histogram.length; i++) {
            this.normalizedHistogram[i] = histogram[i] / sum;
        }

        this.minValues = new Double[this.normalizedHistogram.length];
        this.maxValues = new Double[this.normalizedHistogram.length];

        double binWidth = (max - min) / this.normalizedHistogram.length;

        for (int i = 0; i < this.normalizedHistogram.length; i++) this.minValues[i] = min + binWidth * i;
        for (int i = 0; i < this.normalizedHistogram.length; i++) this.maxValues[i] = min + binWidth * (i + 1);
    }

    @Override
    public Double generate(boolean errorMode, boolean previewMode) {
        double gen = rnd.nextDouble();
        double cumulative = 0;
        double value = 0;

        if (errorMode) {
            if (rnd.nextBoolean()) {
                return this.min - gen * (this.max - this.min);
            } else {
                return this.max + gen * (this.max - this.min);
            }
        }

        for (int i = 0; i < this.normalizedHistogram.length; i++) {
            if (gen <= this.normalizedHistogram[i] + cumulative && gen > cumulative) {
                value = rnd.nextDouble() * (this.maxValues[i] - this.minValues[i]) + this.minValues[i];
                return value;
            }
            cumulative += this.normalizedHistogram[i];
        }
        return value;
    }

    @JsonProperty
    public String getType() {
        return "custom";
    }
}