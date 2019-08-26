package edu.nyu.dtl.synner.core;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.generators.domain.DomainInfo;

import java.util.Map;

public class GeneratorInfo {

    @JsonProperty("available-domains")
    Map<String, DomainInfo> availableDomains;

    public Map<String, DomainInfo> getAvailableDomains() {
        return availableDomains;
    }

    public void setAvailableDomains(Map<String, DomainInfo> availableDomains) {
        this.availableDomains = availableDomains;
    }
}
