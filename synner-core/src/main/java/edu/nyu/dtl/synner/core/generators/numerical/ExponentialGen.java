package edu.nyu.dtl.synner.core.generators.numerical;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import edu.nyu.dtl.synner.core.generators.Generator;

@JsonPropertyOrder({"type", "rate"})
public class ExponentialGen implements Generator<Double> {

    @JsonProperty
    double rate;

    public ExponentialGen(double rate) {
        this.rate = rate;
    }

    @Override
    public Double generate(boolean errorMode, boolean previewMode) {
        if (errorMode) return - rnd.nextDouble() * 100;
        return Math.log(1 - rnd.nextDouble()) / (-rate);
    }

    @JsonProperty
    public String getType() {
        return "exponential";
    }
}
