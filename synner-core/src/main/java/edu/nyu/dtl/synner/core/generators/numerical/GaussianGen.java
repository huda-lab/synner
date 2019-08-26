package edu.nyu.dtl.synner.core.generators.numerical;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import edu.nyu.dtl.synner.core.generators.Generator;

@JsonPropertyOrder({"type", "mean", "stddev"})
public class GaussianGen implements Generator<Double> {

    @JsonProperty
    double mean;

    @JsonProperty("stdev")
    double stdev;

    public GaussianGen(double mean, double stdev) {
        this.mean = mean;
        this.stdev = stdev;
    }

    @Override
    public Double generate(boolean errorMode, boolean previewMode) {
        double res = rnd.nextGaussian() * stdev + mean;
        if (errorMode) return res + (rnd.nextBoolean() ? 1 : - 1) * 4 * stdev;
        return res;
    }

    @JsonProperty
    public String getType() {
        return "gaussian";
    }
}
