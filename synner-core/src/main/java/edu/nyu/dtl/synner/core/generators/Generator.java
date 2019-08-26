package edu.nyu.dtl.synner.core.generators;

import java.util.Random;

public interface Generator<O extends Comparable> {
    Random rnd = new Random();

    O generate(boolean errorMode, boolean previewMode) throws Exception;

    default O generate(Comparable[] inputs, boolean errorMode, boolean previewMode) throws Exception {
        return generate(errorMode, previewMode);
    }

    default Random getRnd() {
        return rnd;
    }

}
