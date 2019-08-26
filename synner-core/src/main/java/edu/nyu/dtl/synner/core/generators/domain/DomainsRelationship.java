package edu.nyu.dtl.synner.core.generators.domain;

import java.util.Objects;

public class DomainsRelationship {
    String domainFrom;
    String domainTo;

    public DomainsRelationship(String domainFrom, String domainTo) {
        this.domainFrom = domainFrom;
        this.domainTo = domainTo;
    }

    public String getDomainFrom() {
        return domainFrom;
    }

    public void setDomainFrom(String domainFrom) {
        this.domainFrom = domainFrom;
    }

    public String getDomainTo() {
        return domainTo;
    }

    public void setDomainTo(String domainTo) {
        this.domainTo = domainTo;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DomainsRelationship that = (DomainsRelationship) o;
        return Objects.equals(domainFrom, that.domainFrom) &&
                Objects.equals(domainTo, that.domainTo);
    }

    @Override
    public int hashCode() {
        return Objects.hash(domainFrom, domainTo);
    }
}
