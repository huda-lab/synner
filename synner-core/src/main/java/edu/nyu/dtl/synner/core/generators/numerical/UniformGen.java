package edu.nyu.dtl.synner.core.generators.numerical;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import edu.nyu.dtl.synner.core.generators.Generator;

@JsonPropertyOrder({"type", "min", "max"})
public class UniformGen implements Generator<Double> {

    @JsonProperty
    double min;

    double max;

    public UniformGen(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public Double generate(boolean errorMode, boolean previewMode) {
        double res = rnd.nextDouble() * (max - min) + min;
        if (errorMode) return res + 2 * (rnd.nextBoolean() ? 1 : - 1) * (max - min) ;
        return res;
    }

    @JsonProperty
    public String getType() {
        return "uniform";
    }
}
