package edu.nyu.dtl.synner.core.generators;

import edu.nyu.dtl.synner.core.datamodel.Field;
import jdk.nashorn.api.scripting.JSObject;

import javax.script.*;
import java.util.List;

public class SwitchGenCase<T extends Comparable> {
    final List<Field> dependencies;
    final String expression;
    final Generator<T> generator;

    JSObject compiledExpression;

    private ScriptEngineManager factory;
    private ScriptEngine engine;

    public SwitchGenCase(String expression, List<Field> dependencies, Generator<T> generator) throws ScriptException {
        this.expression = expression;
        this.dependencies = dependencies;
        this.generator = generator;

        factory = new ScriptEngineManager();
        engine = factory.getEngineByName("JavaScript");

        ScriptContext sc = new SimpleScriptContext();
        sc.setBindings(engine.createBindings(), ScriptContext.ENGINE_SCOPE);

        StringBuilder functionDefBldr = new StringBuilder("function conditionExpression(");
        if (dependencies != null) {
            for (int i = 0; i < dependencies.size(); i++) {
                functionDefBldr.append(dependencies.get(i).getName());
                if (i < dependencies.size() - 1) functionDefBldr.append(",");
            }
        }
        functionDefBldr.append("){ return !!(").append(expression).append(");}");

        engine.eval(functionDefBldr.toString(), sc);

        compiledExpression = (JSObject) sc.getAttribute("conditionExpression", ScriptContext.ENGINE_SCOPE);
    }

    public boolean satisfy(Comparable[] inputs) {
        return (boolean) compiledExpression.call(null, inputs);
    }

    public boolean satisfy() {
        return (boolean) compiledExpression.call(null);
    }
}