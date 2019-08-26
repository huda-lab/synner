package edu.nyu.dtl.synner.core.datamodel;

import java.util.*;
import java.util.logging.Logger;

public class Relationship {
    private static Logger log = Logger.getLogger(Relationship.class.getName());

    private Field from;

    private Field to;

    public Relationship(Field from, Field to) {
        if (from == null || to == null) throw new NullPointerException("the end points of a relationship cannot be null");
        this.from = from;
        this.to = to;
    }

    public Field getFrom() {
        return from;
    }

    public void setFrom(Field from) {
        this.from = from;
    }

    public Field getTo() {
        return to;
    }

    public void setTo(Field to) {
        this.to = to;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Relationship that = (Relationship) o;
        return from.equals(that.from) && to.equals(that.to);
    }

    @Override
    public int hashCode() {
        return Objects.hash(from, to);
    }

    @Override
    public String toString() {
        return from + "->" + to;
    }

    /**
     * Kahn algorithm for topological sort
     *
     * <pre><code>
        L ← Empty list that will contain the sorted elements
        S ← Set of all nodes with no incoming edges
        while S is non-empty do
            remove a node n from S
            add n to tail of L
            for each node m with an edge e from n to m do
                remove edge e from the graph
                if m has no other incoming edges then
                    insert m into S
        if graph has edges then
            return error (graph has at least one cycle)
        else
            return L (a topologically sorted order)
     * </code></pre>
     * */
    public static List<Field> topologicalSort(final Collection<Field> fields) {
        List<Field> l = new ArrayList<>();
        List<Relationship> edges = extractRelationships(fields);
        List<Field> s = getSetOfColumnsWithoutIncomingRelationships(fields, edges);
        while (!s.isEmpty()) {
            Field n = s.remove(0);
            l.add(n);
            ListIterator<Relationship> edgesIt = edges.listIterator();
            while (edgesIt.hasNext()) {
                Relationship e = edgesIt.next();
                if (!e.from.equals(n)) continue;
                edgesIt.remove();
                if (incomingEdges(e.to, edges) == 0) s.add(e.to);
            }
        }
        if (!edges.isEmpty()) return null;
        return l;
    }

    private static List<Relationship> extractRelationships(final Collection<Field> fields) {
        List<Relationship> relationships = new ArrayList<>();
        for (Field f : fields) {
            for (Field d : f.getDependencies()) {
                relationships.add(new Relationship(d, f));
            }
        }
        return relationships;
    }

    public static int incomingEdges(final Field c, final Collection<Relationship> edges) {
        int incoming = 0;
        for (Relationship edge : edges) if (edge.to.equals(c)) incoming++;
        return incoming;
    }

    public static Relationship searchFirstDependency(final Field c, final Collection<Relationship> edges) {
        for (Relationship edge : edges) if (edge.to.equals(c)) return edge;
        return null;
    }

    /** Find if there are columns with multiple entering arcs.
     * @return null if no columns have multiple entering arcs. Returns the first columns
     * that have it. */
    public static Field searchColumnWithMultipleEntriesArcs(final Collection<Relationship> relationships) {
        Set<Field> toCols = new HashSet<>();
        for (Relationship relationship : relationships) {
            if (!toCols.add(relationship.to)) return relationship.to;
        }
        return null;
    }

    public static List<Relationship> extractHardRelationships(final Collection<Relationship> relationships) {
        List<Relationship> filteredRelationships = new ArrayList<>();
        for (Relationship r : relationships) {
            filteredRelationships.add(r);
        }
        return filteredRelationships;
    }

    public static List<Field> getSetOfColumnsWithoutIncomingRelationships(final Collection<Field> fields, final Collection<Relationship> rels) {
        Set<Field> res = new HashSet<>(fields);
        for (Relationship r : rels) res.remove(r.to);
        return new ArrayList<>(res);
    }



}
