package edu.nyu.dtl.synner.core.datamodel;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.*;

import static edu.nyu.dtl.synner.core.datamodel.ColumnType.INT;
import static edu.nyu.dtl.synner.core.datamodel.ColumnType.TIME;

public class Table {

    public final static int FILTERED_GENERATIONS_TENTATIVES = 1000;

    @JsonProperty
    private final Set<Field> fields = new TreeSet<>();

    private List<Field> generationOrder;

    public Table(Collection<Field> fields) {
        this.fields.addAll(fields);
        generationOrder = Relationship.topologicalSort(this.fields);
    }

    public Set<Field> getFields() {
        return Collections.unmodifiableSet(fields);
    }

    public int getColumnsNumber() {
        return fields.size();
    }


    public Comparable finalizeINT(Comparable val) {
        if (val instanceof Double) {
            val = Math.round((Double) val);
        } else if (val instanceof String) {
            val = Math.round(Double.valueOf((String) val));
        } else if (val instanceof StatusValue) {
            StatusValue sv = (StatusValue) val;
            sv.value = finalizeINT(sv.value);
        }
        return val;
    }

    public Comparable finalizeTIME(Comparable val) {
        if (val instanceof StatusValue) {
            StatusValue sv = (StatusValue) val;
            sv.value = finalizeTIME(sv.value);
            return sv;
        } else {
            long v;
            if (val instanceof Double) {
                v = ((Double) val).longValue();
            } else if (val instanceof Long) {
                v = (long) val;
            } else {
                v = ((Integer) val).longValue();
            }
            if (v < 0) v = 60*24 + v;
            v %= 60*24;
            return v;
        }
    }

    public void finalizeValue(Comparable[] tuple, Field c) {
        if (c.getType() == INT && tuple[c.getPos()] != null) {
            tuple[c.getPos()] = finalizeINT(tuple[c.getPos()]);
        } else if (c.getType() == TIME && tuple[c.getPos()] != null) {
            tuple[c.getPos()] = finalizeTIME(tuple[c.getPos()]);
        }
    }

    /**
     * Generate a tuple.
     * @param tuple the tuple to generate, which can be also pre-filled (not null values are not rewrited)
     * @return the tuple given as argument where null values have been replaced with generated ones
     */
    public Comparable[] generateTuple(Comparable[] tuple, boolean previewMode) throws Exception {
        try {

            for (Field c : generationOrder) {
                if (tuple[c.getPos()] != null) continue; //TODO there should be a check of the type/generator
                List<Field> dependencies = c.getDependencies();

                if (c.getMissingRows() > 0) {
                    if (c.getGenerator().getRnd().nextInt(100) < c.getMissingRows()) {
                        tuple[c.getPos()] = null;
                        continue;
                    }
                }
                boolean errorMode = false;
                if (c.getErrorRows() > 0) {
                    if (c.getGenerator().getRnd().nextInt(100) < c.getErrorRows()) errorMode = true;
                }

                boolean filteredValue = true;
                int tentatives = FILTERED_GENERATIONS_TENTATIVES;
                while (tentatives >= 0 && filteredValue) {
                    if (dependencies.isEmpty()) {
                        if (errorMode) {
                            tuple[c.getPos()] = new StatusValue(c.getGenerator().generate(true, previewMode), "error");
                        } else {
                            tuple[c.getPos()] = c.getGenerator().generate(false, previewMode);
                        }
                    } else {
                        Comparable[] dependencyVals = new Comparable[dependencies.size()];
                        for (int i = 0; i < dependencies.size(); i++) {
                            dependencyVals[i] = tuple[dependencies.get(i).getPos()];
                            assert dependencyVals[i] != null;
                        }
                        if (errorMode) {
                            tuple[c.getPos()] = new StatusValue(c.getGenerator().generate(dependencyVals, true, previewMode), "error");
                        } else {
                            tuple[c.getPos()] = c.getGenerator().generate(dependencyVals, false, previewMode);
                        }
                    }
                    filteredValue = !c.evaluateFilter(tuple[c.getPos()]);
                    tentatives--;
                }
                if (tentatives < 0)
                    throw new RuntimeException("Data cannot be generated with the current filter in field " + c.getName());
                finalizeValue(tuple, c);
            }
            return tuple;

        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Generate a tuple. A new tuple to store the generated values is created and returned filled with generated values.
     */
    public Comparable[] generateTuple(boolean previewMode) throws Exception {
        return generateTuple(new Comparable[fields.size()], previewMode);
    }


}
