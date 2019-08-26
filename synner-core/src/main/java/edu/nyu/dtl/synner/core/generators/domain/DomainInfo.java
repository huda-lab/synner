package edu.nyu.dtl.synner.core.generators.domain;

import java.util.ArrayList;
import java.util.List;

public class DomainInfo {
    String domainName;
    String category;
    String readableName;
    String description;

    boolean available = false; // We don't have all the data we should, so there are domain TODO that are not active

    List<String> subdomains = new ArrayList<>();

    public DomainInfo (String domainName, String category, String readableName, String description) {
        this.domainName = domainName;
        this.category = category;
        this.readableName = readableName;
        this.description = description;
    }

    public String getName() {
        return domainName;
    }

    public void setName(String name) {
        this.domainName = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getReadableName() {
        return readableName;
    }

    public void setReadableName(String readableName) {
        this.readableName = readableName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getSubdomains() {
        return subdomains;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    @Override
    public String toString() {
        return "DomainInfo{" +
                "domainName='" + domainName + '\'' +
                ", readableName='" + readableName + '\'' +
                ", category='" + category + '\'' +
                ", description='" + description + '\'' +
                ", subdomains=" + subdomains +
                '}';
    }
}
