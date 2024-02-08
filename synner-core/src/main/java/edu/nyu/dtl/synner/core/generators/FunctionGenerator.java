package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.datamodel.Field;
import edu.nyu.dtl.synner.core.generators.domain.DomainGen;
import org.graalvm.polyglot.*;
import org.graalvm.polyglot.proxy.ProxyExecutable;
import org.graalvm.polyglot.proxy.ProxyObject;

import javax.script.ScriptException;
import java.util.List;
import java.util.Random;
import java.util.function.BiFunction;
import java.util.function.Function;

public class FunctionGenerator<T extends Comparable> implements Generator<T> {

    @JsonProperty
    String strFunction;

    Value function;

    private Context context;
    private static Random rnd = new Random();

    private static String function_domain(String domain) throws Exception {
        DomainGen dGen = new DomainGen(domain);
        return dGen.generate(false, false);
    }

    public FunctionGenerator(String strFunction, List<Field> inputFields) throws ScriptException {
        this.strFunction = strFunction;

        context = Context.newBuilder("js").allowAllAccess(true).build();

        Function<String, String> fDom = domain -> {
            try {
                return function_domain(domain);
            } catch (Exception e) {
                return null;
            }
        };
        context.getBindings("js").putMember("domain", fDom);

        BiFunction<Number, Number, Number> fUniform = (min, max) -> rnd.nextDouble() * (max.doubleValue() - min.doubleValue()) + min.doubleValue();
        context.getBindings("js").putMember("uniform", fUniform);

        BiFunction<Number, Number, Number> fNormal = (mean, stdev) -> rnd.nextGaussian() * stdev.doubleValue() + mean.doubleValue();
        context.getBindings("js").putMember("normal", fNormal);

        StringBuilder functionDefBuilder = new StringBuilder("function generatorFunction(");
        if (inputFields != null) {
            for (Field inputField : inputFields) {
                functionDefBuilder.append(inputField.getName()).append(",");
            }
        }
        functionDefBuilder.append("random){ return (").append(strFunction).append(");}");

        context.eval("js", functionDefBuilder.toString());

        function = context.getBindings("js").getMember("generatorFunction");
    }

    public FunctionGenerator(String strFunction) throws ScriptException {
        this(strFunction, null);
    }

    @Override
    public T generate(boolean errorMode, boolean previewMode) {
        Value result = function.execute(rnd.nextDouble());
        return (T) result.as(Comparable.class);
    }

    @Override
    public T generate(Comparable[] inputs, boolean errorMode, boolean previewMode) {
        Object[] inpts = new Object[inputs.length + 1];
        System.arraycopy(inputs, 0, inpts, 0, inputs.length);
        inpts[inputs.length] = rnd.nextDouble();
        Value result = function.execute(inpts);
        return (T) result.as(Comparable.class);
    }
}
