package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CasesGen<T extends Comparable> implements Generator<T> {

    @JsonProperty
    Generator<T>[] generators;

    public CasesGen(Generator<T>... generators) {
        this.generators = generators;
    }

    @Override
    public T generate(boolean errorMode, boolean previewMode) throws Exception {
        return generators[rnd.nextInt(generators.length)].generate(errorMode, previewMode);
    }

    @Override
    public T generate(Comparable[] inputs, boolean errorMode, boolean previewMode) throws Exception {
        return generate(inputs, errorMode, previewMode);
    }

}
