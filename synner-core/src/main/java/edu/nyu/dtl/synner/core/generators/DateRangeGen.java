package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DateRangeGen implements Generator<Integer> {

    @JsonProperty
    private final int from; // minutes from midnight

    @JsonProperty
    private final int to;

    public DateRangeGen(int from, int to) {
        if (from > to) {
            this.from = to;
            this.to = from;
        } else {
            this.from = from;
            this.to = to;
        }
    }

    @Override
    public Integer generate(boolean errorMode, boolean previewMode) {
        int res = rnd.nextInt(to - from) + from;

        if (errorMode) return rnd.nextBoolean() ? to + rnd.nextInt(1000) : from - rnd.nextInt(1000);

        return res;
    }

}
