package edu.nyu.dtl.synner.core.parser;

import com.fasterxml.jackson.databind.JsonNode;
import edu.nyu.dtl.synner.core.datamodel.Field;
import edu.nyu.dtl.synner.core.datamodel.ColumnType;
import edu.nyu.dtl.synner.core.datamodel.Table;
import edu.nyu.dtl.synner.core.generators.*;

import java.util.*;

import edu.nyu.dtl.synner.core.generators.VisualRelationshipGen.Approximation;
import edu.nyu.dtl.synner.core.generators.domain.DomainGen;
import edu.nyu.dtl.synner.core.generators.numerical.CustomGen;
import edu.nyu.dtl.synner.core.generators.numerical.ExponentialGen;
import edu.nyu.dtl.synner.core.generators.numerical.GaussianGen;
import edu.nyu.dtl.synner.core.generators.numerical.UniformGen;

import javax.script.ScriptException;

import static edu.nyu.dtl.synner.core.parser.Commons.readValue;

public class RelationParser {

    public RelationParser() {

    }

    public Table readModel(JsonNode rootNode) throws ScriptException {
        Map<String, Field> fields = new LinkedHashMap<>();
        readFields(rootNode, fields);
        readRelationships(rootNode, fields);
        readGenerators(rootNode, fields);
        return new Table(fields.values());
    }

    private void readFields(JsonNode rootNode, Map<String, Field> fields) throws ScriptException {
        Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
        int pos = 0;
        while (fieldsIterator.hasNext()) {
            Map.Entry<String, JsonNode> fieldNode = fieldsIterator.next();
            fields.put(fieldNode.getKey(), readField(pos++, fieldNode.getKey(), fieldNode.getValue()));
        }
    }

    private Field readField(int pos, String name, JsonNode jsonNode) throws ScriptException {
        if (jsonNode.has("pos")) pos = jsonNode.get("pos").asInt();
        String filter = null;
        int errorRows = 0;
        int missingRows = 0;
        if (jsonNode.has("filter")) filter = jsonNode.get("filter").asText();
        if (jsonNode.has("errorRows")) errorRows = jsonNode.get("errorRows").asInt();
        if (jsonNode.has("missingRows")) missingRows = jsonNode.get("missingRows").asInt();
        ColumnType type = jsonNode.has("type") ? ColumnType.fromReadableName(jsonNode.get("type").asText()) : null;
        return new Field(name, type, filter, missingRows, errorRows, pos);
    }

    private void readGenerators(JsonNode rootNode, Map<String, Field> fields) {
        Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
        while (fieldsIterator.hasNext()) {
            Map.Entry<String, JsonNode> fieldNode = fieldsIterator.next();
            Field field = fields.get(fieldNode.getKey());
            field.setGenerator(readGenerator(fieldNode.getValue().get("generator"), field));
        }
    }

    private void readRelationships(JsonNode rootNode, Map<String, Field> fields) {
        Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
        while (fieldsIterator.hasNext()) {
            Map.Entry<String, JsonNode> fieldNode = fieldsIterator.next();
            Field field = fields.get(fieldNode.getKey());
            if (fieldNode.getValue().has("dependencies")) {
                Iterator<JsonNode> dependencies = fieldNode.getValue().get("dependencies").elements();
                while (dependencies.hasNext()) {
                    field.addDependency(fields.get(dependencies.next().asText()));
                }
            }
        }
    }

    private Generator readGenerator(JsonNode jsonNode, Field field) {
        if (jsonNode.has("value")) {
            return readConstant(jsonNode.get("value"));
        } else if (jsonNode.has("regexp")) {
            return readRegexp(jsonNode);
        } else if (jsonNode.has("domain")) {
            return readDomain(jsonNode, field);
        } else if (jsonNode.has("cases")) {
            return readCases(jsonNode);
        } else if (jsonNode.has("distribution")) {
            return readDistribution(jsonNode);
        } else if (jsonNode.has("function")) {
            return readFunction(jsonNode.get("function"), field);
        } else if (jsonNode.has("switch")) {
            return readSwitchMap(jsonNode.get("switch"), field);
        } else if (jsonNode.has("visrel")) {
            return readVisRel(jsonNode.get("visrel"), field);
        } else if (jsonNode.has("timerange")) {
            return readTimeRange(jsonNode.get("timerange"), field);
        } else if (jsonNode.has("daterange")) {
            return readDateRange(jsonNode.get("daterange"), field);
        } else {
            return new ConstantGen<>(null);
        }
    }

    private Generator readGenerator(JsonNode jsonNode) {
        return readGenerator(jsonNode, null);
    }

    private Generator<String> readDomain(JsonNode jsonNode, Field field) {
        int joinIdx = -1;
        if (jsonNode.has("join")) {
            String fieldName = jsonNode.get("join").asText();
            List<Field> dependencies = field.getDependencies();
            for (int i = 0; i < dependencies.size(); i++) {
                if (dependencies.get(i).getName().equals(fieldName)) {
                    joinIdx = i;
                    break;
                }
            }
        }

        JsonNode domain = jsonNode.get("domain");
        if (domain.isTextual()) {
            return new DomainGen(domain.asText(), joinIdx);
        } else {
            DomainGen dg = new DomainGen(domain.get("name").asText(), joinIdx);
            if (domain.has("subcategory-name") && domain.has("subcategory-value")
                    && !domain.get("subcategory-name").isNull() && !domain.get("subcategory-value").isNull()) {
                dg.setSubcategory(domain.get("subcategory-name").asText(), domain.get("subcategory-value").asText());
            }
            return dg;
        }
    }

    private Generator<Double> readDistribution(JsonNode jsonNode) {
        JsonNode type = jsonNode.get("distribution");
        switch (type.asText()) {
            case "uniform":
                double min = jsonNode.get("min").asDouble();
                double max = jsonNode.get("max").asDouble();
                return new UniformGen(min, max);
            case "gaussian":
                double mean = jsonNode.get("mean").asDouble();
                double stdev = jsonNode.get("stdev").asDouble();
                return new GaussianGen(mean, stdev);
            case "exponential":
                double rate = jsonNode.get("rate").asDouble();
                return new ExponentialGen(rate);
            case "custom":
                Iterator<JsonNode> histogramIt = jsonNode.get("histogram").elements();
                ArrayList<Double> histogramList = new ArrayList<>();
                while (histogramIt.hasNext()) {
                    histogramList.add(histogramIt.next().asDouble());
                }
                Double[] histograms = new Double[histogramList.size()];
                histograms = histogramList.toArray(histograms);
                double minCustom = jsonNode.get("min").asDouble();
                double maxCustom = jsonNode.get("max").asDouble();
                return new CustomGen(histograms, minCustom, maxCustom);
            default:
                throw new IllegalArgumentException("distribution type not recognised");
        }
    }

    private Generator readCases(JsonNode jsonNode) {
        JsonNode casesNode = jsonNode.get("cases");
        if (!casesNode.isArray()) throw new IllegalArgumentException("The 'cases' field must be an array");
        Generator[] cases = readGeneratorsArray(casesNode);
        double ratioSum = 0;
        double[] ratios = null;

        if (jsonNode.has("ratios")) {
            JsonNode ratiosNode = jsonNode.get("ratios");
            if (ratiosNode.size() != cases.length)
                throw new IllegalArgumentException("the 'ratios' array must have the same size of the 'cases' array");
            ratios = new double[ratiosNode.size()];
            Iterator<JsonNode> ratiosIt = ratiosNode.elements();
            int i = 0;
            while (ratiosIt.hasNext()) {
                double val = ratiosIt.next().asDouble();
                ratios[i++] = val;
                ratioSum += val;
            }
        }

        return ratioSum > 0 ? new CasesCustomDistGen(cases, ratios) : new CasesGen(cases);
    }

    private Generator readConstant(JsonNode jsonNode) {
        return new ConstantGen(readValue(jsonNode));
    }

    private Generator readRegexp(JsonNode jsonNode) {
        return new StringGen(jsonNode.get("regexp").asText());
    }

    private Generator readFunction(JsonNode jsonNode, Field field) {
        if (!jsonNode.isArray()) {
            try {
                return new FunctionGenerator(jsonNode.asText(), field.getDependencies());
            } catch (ScriptException e) {
                throw new IllegalArgumentException("The defined function contains errors", e);
            }
        }

        try {
            Generator[] cases = new Generator[jsonNode.size()];
            Iterator<JsonNode> elementsIt = jsonNode.elements();
            double[] ratios = new double[jsonNode.size()];
            int i = 0;
            while (elementsIt.hasNext()) {
                JsonNode el = elementsIt.next();
                cases[i] = new FunctionGenerator(el.get("expression").asText(), field.getDependencies());
                double val = el.get("freq").asDouble();
                ratios[i] = val;
                i++;
            }

            return new CasesCustomDistGen(cases, ratios);
        } catch (ScriptException e) {
            throw new IllegalArgumentException("The defined function contains errors", e);
        }
    }

    private Generator readSwitchMap(JsonNode jsonNode, Field field) {
        try {
            Iterator<JsonNode> casesIt = jsonNode.elements();
            SwitchGen<Comparable> cg = new SwitchGen<>(field.getDependencies());
            while (casesIt.hasNext()) {
                JsonNode caseEl = casesIt.next();
                if (caseEl.has("case")) {
                    cg.addCondition(caseEl.get("case").asText(), readGenerator(caseEl.get("then"), field));
                } else if (caseEl.has("default")) {
                    cg.setElse(readGenerator(caseEl.get("default"), field));
                }
            }
            return cg;
        } catch (Exception e) {
            throw new IllegalArgumentException("The defined conditional expression contains errors", e);
        }
    }

    private Generator readDateRange(JsonNode jsonNode, Field field) {
        int fromValue = jsonNode.get("from").intValue();
        int toValue = jsonNode.get("to").intValue();

        return new DateRangeGen(fromValue, toValue);
    }

    private Generator readTimeRange(JsonNode jsonNode, Field field) {
        int fromValue = jsonNode.get("from").intValue();
        int toValue = jsonNode.get("to").intValue();

        return new TimeRangeGen(fromValue, toValue);
    }

    private Generator readVisRel(JsonNode jsonNode, Field field) {
        double[] inValues = toDoubleArray(readValuesArray(jsonNode.get("in")));
        double[] outValues = toDoubleArray(readValuesArray(jsonNode.get("out")));
        if (inValues.length != outValues.length) throw new IllegalArgumentException("Visual relationship must have" +
                "the same number of elements in the in and out arrays");

        int inputFieldIdx = -1;
        String inputFieldName = jsonNode.get("input-field").asText();
        List<Field> dependencies = field.getDependencies();
        for (int i = 0; i < dependencies.size(); i++) {
            if (dependencies.get(i).getName().equals(inputFieldName)) {
                inputFieldIdx = i;
                break;
            }
        }
        if (inputFieldIdx == -1) throw new IllegalArgumentException("Invalid input field for visual relationship");

        double inMin = jsonNode.has("in-min") ? Double.valueOf(jsonNode.get("in-min").asText()) : 0;
        double inMax = jsonNode.has("in-max") ? Double.valueOf(jsonNode.get("in-max").asText()) : 1;
        double outMin = jsonNode.has("out-min") ? Double.valueOf(jsonNode.get("out-min").asText()) : 0;
        double outMax = jsonNode.has("out-max") ? Double.valueOf(jsonNode.get("out-max").asText()) : 1;
        double noises = jsonNode.has("noises") ? Double.valueOf(jsonNode.get("noises").asText()) : 0.05;
        if (noises <= 0.01) noises = 0.01;

        Approximation apprx = jsonNode.has("approximation") ? Approximation.valueOf(jsonNode.get("approximation").asText()) : Approximation.low;
        return new VisualRelationshipGen(inputFieldIdx, inValues, outValues, inMin, inMax, outMin, outMax, apprx, noises);
    }

    private Generator[] readGeneratorsArray(JsonNode elements) {
        if (!elements.isArray()) throw new IllegalArgumentException("expected array");
        Generator[] res = new Generator[elements.size()];
        Iterator<JsonNode> elementsIt = elements.elements();
        int i = 0;
        while (elementsIt.hasNext()) res[i++] = readGenerator(elementsIt.next());
        return res;
    }

    private double[] toDoubleArray(Comparable[] array) {
        double[] res = new double[array.length];
        for (int i = 0; i < res.length; i++) res[i] = (double) array[i];
        return res;
    }

    private Comparable[] readValuesArray(JsonNode elements) {
        if (!elements.isArray()) throw new IllegalArgumentException("expected array");
        Comparable[] res = new Comparable[elements.size()];
        Iterator<JsonNode> elementsIt = elements.elements();
        int i = 0;
        while (elementsIt.hasNext()) res[i++] = readValue(elementsIt.next());
        return res;
    }

}
