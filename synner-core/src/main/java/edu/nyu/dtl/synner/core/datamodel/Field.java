package edu.nyu.dtl.synner.core.datamodel;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.generators.Generator;
import jdk.nashorn.api.scripting.JSObject;

import javax.script.*;
import java.util.ArrayList;
import java.util.List;

public class Field implements Comparable<Field> {

    @JsonProperty
    private final String name;

    @JsonProperty
    private final int pos;

    @JsonProperty
    private final List<Field> dependencies = new ArrayList<>();

    @JsonProperty
    private String filter;

    @JsonProperty
    private int missingRows;


    @JsonProperty
    private int errorRows;

    @JsonProperty
    private String format;

    @JsonProperty
    private ColumnType type;

    @JsonProperty
    private Generator generator; // used as generator, or as fallback in case of relationships between columns

    JSObject compiledExpression;

    private ScriptEngineManager factory;
    private ScriptEngine engine;

    public Field(String name, ColumnType type, String filter, int missingRows, int errorRows, int pos) throws ScriptException {
        if (name == null || name.length() == 0) throw new IllegalArgumentException("Name should be a valid name");
        this.name = name;
        this.type = type;
        this.pos = pos;
        this.setFilter(filter);
        this.missingRows = missingRows;
        this.errorRows = errorRows;
    }

    public String getName() {
        return name;
    }

    public void setGenerator(Generator generator) {
        this.generator = generator;
    }

    public Generator getGenerator() {
        return generator;
    }

    public ColumnType getType() {
        return type;
    }

    public void setType(ColumnType type) {
        this.type = type;
    }

    public int getPos() {
        return pos;
    }

    public List<Field> getDependencies() {
        return dependencies;
    }

    public void addDependency(Field field) {
        dependencies.add(field);
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public String format(Comparable value) {
        if (format == null) return value.toString();
        return String.format(format, value);
    }

    public void setFilter(String filter) throws ScriptException {
        this.filter = filter;
        if (filter == null || filter.length() == 0) return;

        factory = new ScriptEngineManager();
        engine = factory.getEngineByName("JavaScript");

        ScriptContext sc = new SimpleScriptContext();
        sc.setBindings(engine.createBindings(), ScriptContext.ENGINE_SCOPE);
        engine.eval("function conditionExpression(" + this.name + "){ return !!(" + this.filter + ");}", sc);

        compiledExpression = (JSObject) sc.getAttribute("conditionExpression", ScriptContext.ENGINE_SCOPE);
    }

    public String getFilter() {
        return filter;
    }

    public int getMissingRows() {
        return missingRows;
    }

    public void setMissingRows(int missingRows) {
        this.missingRows = missingRows;
    }

    public int getErrorRows() {
        return errorRows;
    }

    public void setErrorRows(int errorRows) {
        this.errorRows = errorRows;
    }

    public boolean evaluateFilter(Object fieldValue) {
        if (compiledExpression == null) return true;
        return (boolean) compiledExpression.call(null, fieldValue);
    }

    @Override
    public boolean equals(Object o) {
        return this == o || !(o == null || getClass() != o.getClass()) && name.equals(((Field) o).name);
    }

    @Override
    public int hashCode() {
        return name.hashCode();
    }

    @Override
    public String toString() {
        return name;
    }

    public String toString(boolean printDetails) {
        if (!printDetails) return toString();
        return pos + " - " + name + "<" + type + "> { dependencies:" + dependencies.toString() + ", generator: " + generator + "}";
    }

    @Override
    public int compareTo(Field o) {
        return Integer.compare(pos, o.pos);
    }
}
