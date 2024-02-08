package edu.nyu.dtl.synner.core.generators;

import edu.nyu.dtl.synner.core.datamodel.Field;
import org.graalvm.polyglot.*;
import org.graalvm.polyglot.proxy.ProxyArray;

import java.util.List;

public class SwitchGenCase<T extends Comparable> {
    final List<Field> dependencies;
    final String expression;
    final Generator<T> generator;

    Value compiledExpression;

    private Context context;

    public SwitchGenCase(String expression, List<Field> dependencies, Generator<T> generator) {
        this.expression = expression;
        this.dependencies = dependencies;
        this.generator = generator;

        context = Context.newBuilder("js").allowAllAccess(true).build();

        StringBuilder functionDefBuilder = new StringBuilder("function conditionExpression(");
        if (dependencies != null) {
            for (int i = 0; i < dependencies.size(); i++) {
                functionDefBuilder.append(dependencies.get(i).getName());
                if (i < dependencies.size() - 1) functionDefBuilder.append(",");
            }
        }
        functionDefBuilder.append("){ return !!(").append(expression).append(");}");

        context.eval("js", functionDefBuilder.toString());

        compiledExpression = context.getBindings("js").getMember("conditionExpression");
    }

    public boolean satisfy(Comparable[] inputs) {
        Value result = compiledExpression.execute((Object) inputs);
        return result.asBoolean();
    }

    public boolean satisfy() {
        Value result = compiledExpression.execute();
        return result.asBoolean();
    }
}
