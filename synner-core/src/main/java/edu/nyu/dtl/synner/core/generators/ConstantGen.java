package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.datamodel.ColumnType;

public class ConstantGen<T extends Comparable> implements Generator<T> {

    @JsonProperty
    T constant;

    public ConstantGen(T value) {
        this.constant = value;
    }

    public T getConstant() {
        return constant;
    }

    @Override
    public T generate(boolean errorMode, boolean previewMode) {
        return constant;
    }

}
