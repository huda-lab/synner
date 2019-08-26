package edu.nyu.dtl.synner.core.generators.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.nyu.dtl.synner.core.generators.Generator;

import java.sql.Connection;
import java.sql.SQLException;

import static edu.nyu.dtl.synner.core.generators.domain.DomainsManager.*;

public class DomainGen implements Generator<String> {

    public static Connection CONNECTION = null;

    @JsonProperty
    private final String domainName;
    private String subcategoryDomainName = null;
    private String subcategoryDomainValue = null;

    private final int joinIndex; // -1 if there is no join

    public DomainGen(String domainName, int joinIndex) {
        this.domainName = domainName;
        this.joinIndex = joinIndex;
    }

    public DomainGen(String domain) {
        this(domain, -1);
    }

    public static synchronized Connection getConnection() throws SQLException {
        if (CONNECTION == null) {
            CONNECTION = DomainsManager.getConnection();
        }
        return CONNECTION;
    }

    public void setSubcategory(String subcategoryDomainName, String subcategoryDomainValue) {
        this.subcategoryDomainName = subcategoryDomainName;
        this.subcategoryDomainValue = subcategoryDomainValue;
    }

    @Override
    public String generate(boolean errorMode, boolean previewMode) throws Exception {
        return generate(null, errorMode, previewMode);
    }

    @Override
    public synchronized String generate(Comparable[] inputs, boolean errorMode, boolean previewMode) throws SQLException {
        if (errorMode) {
            char[] str = new char[rnd.nextInt(10) + 4];
            for (int i = 0; i < str.length; i++) str[i] = (char)(rnd.nextInt('z' - '0') + '0');
            return new String(str);
        }
        Connection c = getConnection();
        if (subcategoryDomainValue != null && subcategoryDomainName != null) {
            return generateValueFromRefValue(c, subcategoryDomainValue, subcategoryDomainName, domainName, rnd, previewMode);
        } else if (inputs != null && inputs.length > 0 && joinIndex >= 0) {
            Comparable joinInput = inputs[joinIndex];
            return generateValueFromRefValue(c, joinInput.toString(), domainName, rnd, previewMode);
        }

        return getRandomValue(c, domainName, rnd);
    }
}
