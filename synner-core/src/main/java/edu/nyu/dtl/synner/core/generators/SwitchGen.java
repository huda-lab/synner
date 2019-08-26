package edu.nyu.dtl.synner.core.generators;

import edu.nyu.dtl.synner.core.datamodel.Field;

import javax.script.ScriptException;
import java.util.ArrayList;
import java.util.List;

public class SwitchGen<T extends Comparable> implements Generator<T> {

    List<SwitchGenCase<T>> cases = new ArrayList<>();

    Generator<T> elseCase;

    List<Field> dependencies;

    public SwitchGen(List<Field> dependencies) {
        this.dependencies = dependencies;
    }

    @Override
    public T generate(boolean errorMode, boolean previewMode) throws Exception {
        for (SwitchGenCase<T> c : cases) {
            if (c.satisfy()) {
                return c.generator.generate(errorMode, previewMode);
            }
        }

        return elseCase.generate(errorMode, previewMode);
    }

    @Override
    public T generate(Comparable[] inputs, boolean errorMode, boolean previewMode) throws Exception {
        for (SwitchGenCase<T> c : cases) {
            if (c.satisfy(inputs)) {
                return c.generator.generate(inputs, errorMode, previewMode);
            }
        }

        return elseCase.generate(inputs, errorMode, previewMode);
    }

    public void addCondition(String expression, Generator<T> then) throws ScriptException {
        cases.add(new SwitchGenCase<>(expression, dependencies, then));
    }

    public void setElse(Generator<T> elseCase) {
        this.elseCase = elseCase;
    }
}
