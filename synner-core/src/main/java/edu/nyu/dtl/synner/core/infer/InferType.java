package edu.nyu.dtl.synner.core.infer;

import com.fasterxml.jackson.annotation.JsonProperty;

public class InferType implements Comparable<InferType> {

    @JsonProperty
    String id;

    @JsonProperty
    String title;

    public InferType() {

    }

    public InferType(String id, String title) {
        this.id = id;
        this.title = title;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        return id.equals(((InferType) o).id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    @Override
    public int compareTo(InferType o) {
        return id.compareTo(o.id);
    }

    @Override
    public String toString() {
        return "{id='" + id + '\'' +
                ", title='" + title + '\'' +
                '}';
    }
}
