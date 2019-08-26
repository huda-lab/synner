package edu.nyu.dtl.synner.core.infer;

import java.util.List;

public class DomainDetail implements Comparable<DomainDetail> {
    public String domain;
    public String domainReadableName;
    public List<String> examples;
    public int count; // number of times that an example value was found in the domain values
    public Double kNNscore; // kNN value between example and domain values

    DomainDetail(String domain, String readableName, int count, Double kNNscore, List<String> examples) {
        this.count = count;
        this.domain = domain;
        this.domainReadableName = readableName;
        this.kNNscore = kNNscore;
        this.examples = examples;
    }

    @Override
    public int compareTo(DomainDetail domainDetail) {
        int comp = Integer.compare(this.count, domainDetail.count);
        if (comp != 0) return comp;
        int kComp = Double.compare(domainDetail.kNNscore, this.kNNscore);
        return kComp;
    }

    public String toString() {
        return domain + " : " + count + " : " + kNNscore;
    }
}
