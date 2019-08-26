package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.datamodel.Field;
import edu.nyu.dtl.synner.core.generators.domain.DomainGen;
import jdk.nashorn.api.scripting.JSObject;

import javax.script.*;
import java.util.List;
import java.util.function.BiFunction;
import java.util.function.Function;

public class FunctionGenerator<T extends Comparable> implements Generator<T> {

    @JsonProperty
    String strFunction;

    JSObject function;

    private ScriptEngineManager factory;
    private ScriptEngine engine;

    private static String function_domain(String domain) throws Exception {
        DomainGen dGen = new DomainGen(domain);
        return dGen.generate(false, false);
    }

    public FunctionGenerator(String strFunction, List<Field> inputFields) throws ScriptException {
        this.strFunction = strFunction;

        factory = new ScriptEngineManager();
        engine = factory.getEngineByName("JavaScript");

        ScriptContext sc = new SimpleScriptContext();
        sc.setBindings(engine.createBindings(), ScriptContext.ENGINE_SCOPE);

        Function<String, String> fDom = (String domain) -> {
            try {
                return function_domain(domain);
            } catch (Exception e) {
                return null;
            }
        };
        sc.setAttribute("domain", fDom, ScriptContext.ENGINE_SCOPE);

        BiFunction<Number, Number, Number> fUniform = (Number min, Number max) -> {
            try {
                return rnd.nextDouble() * (max.doubleValue() - min.doubleValue()) + min.doubleValue();
            } catch (Exception e) {
                return null;
            }
        };
        sc.setAttribute("uniform", fUniform, ScriptContext.ENGINE_SCOPE);

        BiFunction<Number, Number, Number> fNormal = (Number mean, Number stdev) -> {
            try {
                return rnd.nextGaussian() * stdev.doubleValue() + mean.doubleValue();
            } catch (Exception e) {
                return null;
            }
        };
        sc.setAttribute("normal", fNormal, ScriptContext.ENGINE_SCOPE);

        StringBuilder functionDefBldr = new StringBuilder("function generatorFunction(");
            if (inputFields != null) {
            for (int i = 0; i < inputFields.size(); i++) {
                functionDefBldr.append(inputFields.get(i).getName());
                functionDefBldr.append(",");
            }
            functionDefBldr.append("random");
        }
        functionDefBldr.append("){ return (").append(strFunction).append(");}");

        engine.eval(functionDefBldr.toString(), sc);

        function = (JSObject) sc.getAttribute("generatorFunction", ScriptContext.ENGINE_SCOPE);
    }

    public FunctionGenerator(String strFunction) throws ScriptException {
        this(strFunction, null);
    }

    @Override
    public T generate(boolean errorMode, boolean previewMode) {
        return (T) function.call(null, rnd.nextDouble());
    }

    @Override
    public T generate(Comparable[] inputs, boolean errorMode, boolean previewMode) {
        Object[] inpts = new Object[inputs.length + 1];
        for (int i = 0; i < inputs.length; i++) {
            inpts[i] = inputs[i];
        }
        inpts[inputs.length] = rnd.nextDouble();
        return (T) function.call(null, inpts);
    }

}
