package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TimeRangeGen implements Generator<Integer> {

    @JsonProperty
    private final int from; // minutes from midnight

    @JsonProperty
    private final int to;

    public TimeRangeGen(int from, int to) {
        this.from = from;
        this.to = to;
    }

    @Override
    public Integer generate(boolean errorMode, boolean previewMode) {
        int res = from;

        if (from < to) {
            res = rnd.nextInt(to - from) + from;
        } else if (from > to) {
            res = (rnd.nextInt(60*24 - from + to) + from) % (60*24);
        }

        if (errorMode) return (to + rnd.nextInt(60)) % (60*24);

        return res;
    }

}
