package edu.nyu.dtl.synner.core.generators.domain;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
//import com.zaxxer.hikari.HikariConfig;
//import com.zaxxer.hikari.HikariDataSource;

import java.io.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

public class DomainsManager {

//    private static HikariConfig config = new HikariConfig();
//    private static HikariDataSource ds;
//
//    static {
//        config.setJdbcUrl("jdbc:sqlite:database.db");
//        config.setMaximumPoolSize(10);
//        config.setMinimumIdle(0);
//        config.setIdleTimeout(1);
//        config.setConnectionTimeout(10000);
//        ds = new HikariDataSource(config);
//    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection("jdbc:sqlite::resource:database.db");
//        return ds.getConnection();
    }

    public static void loadDataset(InputStream inputStream) throws SQLException, CsvValidationException {
        domainCachedList = null;
        Connection c = getConnection();
        PreparedStatement existTableStm = c.prepareStatement("select exists(select 1 from sqlite_master where type = 'table' and tbl_name = ?)");

        try {
            CSVReader reader = new CSVReader(new InputStreamReader(inputStream));
            boolean relMode = true;

            String[] domains = reader.readNext();
            for (int i = 0; i < domains.length; i++) {
                domains[i] = domains[i].toUpperCase();

                if (domains[i].equals("FREQ")
                        || domains[i].equals("ALIAS_1")
                        || domains[i].equals("ALIAS_2")
                        || domains[i].equals("ALIAS_3")) {
                    relMode = false;
                    continue;
                }

                // Create missing table if it doesn't exist
                existTableStm.setString(1, "Domain_" + domains[i]);
                if (existTableStm.executeQuery().getInt(1) == 0) {
                    c.createStatement().execute("create table Domain_" + domains[i] + "(" +
                            "val text primary key, " +
                            "freq integer default 1, " +
                            "alias_1 text, " +
                            "alias_2 text, " +
                            "alias_3 text);"
                    );
                }
            }

            if (relMode) {

                // Creating needed relationships. For example the input is NAME,GENDER,NATIONALITY then two
                // relationships are created: Rel_NAME-GENDER and Rel_NAME-NATIONALITY
                for (int i = 1; i < domains.length; i++) {
                    existTableStm.setString(1, "Rel_" + domains[i - 1] + "_" + domains[i]);
                    if (existTableStm.executeQuery().getInt(1) == 0) {
                        c.createStatement().execute("create table Rel_" + domains[i - 1] + "_" + domains[i] + " (" +
                                "val text not null references \" + domains[i - 1] + \", " +
                                "valref text not null references " + domains[i] + "," +
                                "primary key (val, valref))"
                        );
                        c.createStatement().execute("create index IDX_VALREF_" + domains[i - 1] + "_" + domains[i]
                                + " on Rel_" + domains[i - 1] + "_" + domains[i] + " (valref);");
                    }
                }

                String[] row;
                while ((row = reader.readNext()) != null) {
                    // Inserting single values in Domain tables
                    for (int i = 0; i < row.length; i++) {
                        PreparedStatement ps = c.prepareStatement("insert or ignore into Domain_" + domains[i] + "(val) values (?);");
                        ps.setString(1, row[i]);
                        ps.execute();
                    }

                    // Populating relationships.
                    for (int i = 1; i < row.length; i++) {
                        PreparedStatement ps = c.prepareStatement("insert or ignore into Rel_" + domains[i - 1] + "_" + domains[i] + "(val, valref) values (?,?);");
                        ps.setString(1, row[0]);
                        ps.setString(2, row[i]);
                        ps.execute();
                    }
                }

            } else {
                int freqIdx = -1, alias1Idx = -1, alias2Idx = -1, alias3Idx = -1;

                for (int i = 0; i < domains.length; i++) {
                    if (domains[i].equals("FREQ")) freqIdx = i;
                    if (domains[i].equals("ALIAS_1")) alias1Idx = i;
                    if (domains[i].equals("ALIAS_2")) alias2Idx = i;
                    if (domains[i].equals("ALIAS_3")) alias3Idx = i;
                }

                PreparedStatement existValStm = c.prepareStatement("select exists(select 1 from Domain_" + domains[0] + " where val = ?)");
                String[] row;
                while ((row = reader.readNext()) != null) {
                    existValStm.setString(1, row[0]);
                    if (existValStm.executeQuery().getInt(1) == 0) {
                        PreparedStatement ps = c.prepareStatement("insert or ignore into Domain_" + domains[0]
                                + "(val,freq,alias_1,alias_2,alias_3) values (?,?,?,?,?);");
                        ps.setString(1, row[0]);
                        ps.setString(2, freqIdx > 0 ? row[freqIdx] : null);
                        ps.setString(3, alias1Idx > 0 ? row[alias1Idx] : null);
                        ps.setString(4, alias2Idx > 0 ? row[alias2Idx] : null);
                        ps.setString(5, alias3Idx > 0 ? row[alias3Idx] : null);
                        ps.execute();
                    } else {
                        StringBuilder sb = new StringBuilder("update Domain_" + domains[0] + " set");
                        boolean first = true;
                        if (freqIdx > 0 && freqIdx < row.length) {
                            sb.append(" freq = ").append(row[freqIdx]);
                            first = false;
                        }
                        if (alias1Idx > 0 && alias1Idx < row.length) {
                            if (!first) sb.append(",");
                            sb.append(" alias_1 = \"").append(row[alias1Idx]).append("\"");
                            first = false;
                        }
                        if (alias2Idx > 0 && alias2Idx < row.length) {
                            if (!first) sb.append(",");
                            sb.append(" alias_2 = \"").append(row[alias2Idx]).append("\"");
                            first = false;
                        }
                        if (alias3Idx > 0 && alias3Idx < row.length) {
                            if (!first) sb.append(",");
                            sb.append(" alias_3 = \"").append(row[alias3Idx]).append("\"");
                            first = false;
                        }
                        sb.append(" where val = ?");
                        if (!first) {
                            PreparedStatement ps = c.prepareStatement(sb.toString());
                            ps.setString(1, row[0]);
                            ps.execute();
                        }
                    }
                }
            }

        } catch (IOException e) {
            e.printStackTrace();
        }

        c.close();
    }

    public static void readDescriptionInput(InputStream inputStream) throws SQLException, CsvValidationException {
        domainCachedList = null;
        Connection c = getConnection();

        try {
            CSVReader reader = new CSVReader(new InputStreamReader(inputStream));
            String[] domains = reader.readNext();
            if (!domains[0].equals("domain")) throw new IllegalArgumentException("domain should be he first column in the input");
            if (!domains[1].equals("ordernum")) throw new IllegalArgumentException("ordernum should be he second column in the input");
            if (!domains[2].equals("category")) throw new IllegalArgumentException("category should be the third column in the input");
            if (!domains[3].equals("rname")) throw new IllegalArgumentException("rname should be the forth column in the input");
            if (!domains[4].equals("description")) throw new IllegalArgumentException("description should be the fifth column in the input");

            String[] row;
            while ((row = reader.readNext()) != null) {
                PreparedStatement existDescStm = c.prepareStatement("select count(*) from Domains_Info where domain = ?");
                existDescStm.setString(1, "Domain_" + row[0].toUpperCase());
                if (existDescStm.executeQuery().getInt(1) == 0) { // the description doesn't exist
                    PreparedStatement ps = c.prepareStatement("insert or ignore into Domains_Info values (?,?,?,?,?);");
                    ps.setString(1, "Domain_" + row[0].toUpperCase());
                    ps.setString(2, row[1]);
                    ps.setString(3, row[2]);
                    ps.setString(4, row[3]);
                    ps.setString(5, row[4]);
                    ps.execute();
                } else {
                    PreparedStatement ps = c.prepareStatement("update Domains_Info set ordernum = ?, category = ?, readeable_name = ?, description = ? where domain = ?;");
                    ps.setString(1, row[1]);
                    ps.setString(2, row[2]);
                    ps.setString(3, row[3]);
                    ps.setString(4, row[4]);
                    ps.setString(5, "Domain_" + row[0].toUpperCase());
                    ps.execute();
                }
            }

        } catch (IOException e) {
            e.printStackTrace();
        }

        c.close();
    }

    private static Map<String, DomainInfo> domainCachedList = null;
    private static Map<String, DomainInfo> domainAvailableCachedList = null;
    public static Map<String, DomainInfo> getDomains(Connection c) throws SQLException {
        return getDomains(c, true, null);
    }
    public static Map<String, DomainInfo> getDomains(Connection c, boolean getOnlyAvailable, String relateToDomain) throws SQLException {
        if (domainCachedList == null) {
            ResultSet rs = c.createStatement().executeQuery("select * from Domains_Info order by ordernum");
            Map<String, DomainInfo> res = new LinkedHashMap<>();
            while (rs.next()) {
                String domainName = rs.getString("domain").replace("Domain_", "");
                DomainInfo domainInfo = new DomainInfo(domainName, rs.getString("category"), rs.getString("readeable_name"), rs.getString("description"));

                if (existDomain(c, domainName)) domainInfo.setAvailable(true);

                List<String> doms = getDirectReachableDomainsFromDomain(c, domainInfo.domainName);
                for (String dom : doms) {
                    domainInfo.getSubdomains().add(dom);
                }

                res.put(domainName, domainInfo);
            }

            domainCachedList = res;
        }

        Map<String, DomainInfo> res = domainCachedList;
        if (getOnlyAvailable) {
            if (domainAvailableCachedList == null) {
                Map<String, DomainInfo> filteredRes = new LinkedHashMap<>();
                for (Map.Entry<String, DomainInfo> e : domainCachedList.entrySet()) {
                    if (e.getValue().isAvailable()) filteredRes.put(e.getKey(), e.getValue());
                }
                domainAvailableCachedList = filteredRes;
            }
            res = domainAvailableCachedList;
        }

        if (relateToDomain != null) {
            Map<String, DomainInfo> filteredRes = new LinkedHashMap<>();
            for (Map.Entry<String, DomainInfo> e : res.entrySet()) {
                List<String> path = findPath(c, relateToDomain, e.getValue().domainName, new ArrayList<>());
                if (path != null && !path.isEmpty()) {
                    filteredRes.put(e.getKey(), e.getValue());
                }
            }
            res = filteredRes;
        }

        return res;
    }

    static Map<String, Integer> FREQ_SUM = new HashMap<>();
    public synchronized static int getFreqSum(Connection c, String domain) throws SQLException {
        if (!FREQ_SUM.containsKey(domain)) {
            Statement st = c.createStatement();
            ResultSet rs = st.executeQuery("select sum(freq) from Domain_" + domain.toUpperCase());
            FREQ_SUM.put(domain, rs.getInt(1));
        }
        return FREQ_SUM.get(domain);
    }

    static Map<String, List<FreqValue>> VALUES_CACHE = new HashMap<>();
    public static String getRandomValue(Connection c, String domain, Random rnd) throws SQLException {
        int freqSum = getFreqSum(c, domain);
        int rIdx = rnd.nextInt(freqSum);
        if (!VALUES_CACHE.containsKey(domain)) {
            ResultSet rs = c.createStatement().executeQuery("select * from Domain_" + domain.toUpperCase() + " order by freq desc");
            List<FreqValue> values = new ArrayList<>();
            while (rs.next()) {
                values.add(new FreqValue(rs.getInt("freq"), rs.getString("val")));
            }
            VALUES_CACHE.put(domain, values);
        }
        List<FreqValue> values = VALUES_CACHE.get(domain);
        int freqCumSum = 0;
        for (FreqValue v : values) {
            freqCumSum += v.getFreq();
            if (rIdx < freqCumSum) return v.getValue();
        }
        throw new IllegalArgumentException("frequency is not consistent");
    }

    public static List<String> getValues(Connection c, String domain) throws SQLException {
        List<String> res = new ArrayList<>();
        ResultSet rs = c.createStatement().executeQuery("select * from Domain_" + domain.toUpperCase());
        while (rs.next()) {
            res.add(rs.getString("val"));
        }
        return res;
    }
    public static List<String> getValues(Connection c, DomainInfo domain) throws SQLException {
        return getValues(c, domain.getName());
    }

    public static String findRootValue(Connection c, String value, String domain) throws SQLException {
        PreparedStatement st = c.prepareStatement("select exists(select 1 from " + "Domain_" + domain.toUpperCase() + " where lower(val) = ?)");
        st.setString(1, value.toLowerCase());
        ResultSet rs = st.executeQuery();
        if (rs.getInt(1) == 1) {
            return value;
        } else {
            value = value.toLowerCase();
            for (int i = 0; i < 3; i++) {
                st = c.prepareStatement("select val from Domain_" + domain.toUpperCase() + " where lower(alias_" + (i + 1) + ") = ?");
                st.setString(1, value);
                rs = st.executeQuery();
                if (!rs.isClosed()) return rs.getString("val");
            }
        }
        return null;
    }

    private static List<DomainsRelationship> domainsRelationshipsCached = null;
    private static List<DomainsRelationship> getDirectRelations(Connection c) throws SQLException {
        if (domainsRelationshipsCached == null) {
            List<DomainsRelationship> res = new ArrayList<>();
            ResultSet rs = c.createStatement().executeQuery("select tbl_name from sqlite_master where type = \"table\"");
            while (rs.next()) {
                String tbl_name = rs.getString("tbl_name");
                if (!tbl_name.startsWith("Rel_")) continue;
                String[] s = tbl_name.split("_");
                res.add(new DomainsRelationship(s[1], s[2]));
            }
            domainsRelationshipsCached = res;
        }
        return domainsRelationshipsCached;
    }

    private static Map<String, String> directRelCachedValues = new HashMap<>();
    public static String existDirectRel(Connection c, String sourceDomain, String targetDomain) throws SQLException {

        String cacheKey = sourceDomain + targetDomain;
        String cacheKeyInverse = targetDomain + sourceDomain;
        if (directRelCachedValues.containsKey(cacheKey)) {
            return directRelCachedValues.get(cacheKey);
        }

        ResultSet rs = c.createStatement().executeQuery("select tbl_name from sqlite_master where type = \"table\" " +
                "and tbl_name like \"Rel_%\" " +
                "and tbl_name like \"%" + sourceDomain + "%\" " +
                "and tbl_name like \"%" + targetDomain + "%\"");
        if (!rs.next()) {
            directRelCachedValues.put(cacheKey, null);
            directRelCachedValues.put(cacheKeyInverse, null);
            return null;
        }

        String tblName = rs.getString("tbl_name");
        directRelCachedValues.put(cacheKey, tblName);
        directRelCachedValues.put(cacheKeyInverse, tblName);
        return tblName;
    }

    public static boolean existDomain(Connection c, String domain) throws SQLException {
        ResultSet rs = c.createStatement().executeQuery("select tbl_name from sqlite_master where type = \"table\" and tbl_name = \"Domain_" + domain + "\"");
        return rs.next();
    }

    public static List<String> getDirectReachableDomainsFromDomain(Connection c, String domain) throws SQLException {
        List<String> res = new ArrayList<>();
        List<DomainsRelationship> rels = getDirectRelations(c);
        for (DomainsRelationship rel : rels) {
            if (rel.getDomainFrom().equals(domain)) {
                res.add(rel.getDomainTo());
            } else if (rel.getDomainTo().equals(domain)) {
                res.add(rel.getDomainFrom());
            }
        }
        return res;
    }

    // It finds the path between a relationship A and B. For example from CONTINENT to CITY as [CONTINENT,COUNTRY,CITY]
    public static List<String> findPath(Connection c, String sourceDomain, String targetDomain, List<String> visitedDomains) throws SQLException {
        visitedDomains.add(sourceDomain);

        // If the target node is reached then we return a path with just the target node
        if (targetDomain.equals(sourceDomain)) {
            List<String> res = new ArrayList<>();
            res.add(targetDomain);
            visitedDomains.remove(sourceDomain);
            return res;
        }

        // Get list of reachable domains that have not been visited
        List<String> adjacentDomains = getDirectReachableDomainsFromDomain(c, sourceDomain);
        adjacentDomains.removeIf((s) -> visitedDomains.contains(s));

        List<String> minPath = null;
        for (String adjacentDomain : adjacentDomains) {
            List<String> res = findPath(c, adjacentDomain, targetDomain, visitedDomains);
            if (res != null && (minPath == null || minPath.size() > res.size())) minPath = res;
        }
        if (minPath != null) minPath.add(0, sourceDomain);

        visitedDomains.remove(sourceDomain);
        return minPath;
    }

    private static Cache<String, List<String>> valuesFromRefValue = CacheBuilder.newBuilder()
            .maximumSize(50).expireAfterWrite(10, TimeUnit.MINUTES).build();
    public static String generateValueFromRefValue(Connection c, String refValue, String refValueDomain, String targetDomain, Random rnd, boolean previewMode) throws SQLException {
        String rootValue = findRootValue(c, refValue, refValueDomain);
        if (rootValue == null) return null;

        // If the root value is found we try to see if there is a relationship di.domainName <-> targetDomain
        String relName = existDirectRel(c, refValueDomain, targetDomain);
        if (relName == null) {
            // Search for path and then call single steps
            List<String> path = findPath(c, refValueDomain, targetDomain, new ArrayList<>());
            if (path == null) return null;
            String lastValue = refValue;
            for (int i = 1; i < path.size(); i++) {
                lastValue = generateValueFromRefValue(c, lastValue, path.get(i - 1), path.get(i), rnd, previewMode);
                if (lastValue == null) return null;
            }
            return lastValue;
        } else {
            PreparedStatement st;
            // Depending if rootValue is either as valref or val we need to look the relationship in the opposite way
            String vA = "valref", vB = "val";
            if (relName.indexOf(refValueDomain) > relName.indexOf(targetDomain)) {
                vA = "val"; vB = "valref";
            }

            if (previewMode) {
                String cacheKey = refValueDomain + "_" + refValue + "_" + targetDomain;
                List<String> vals = valuesFromRefValue.getIfPresent(cacheKey);
                if (vals == null) {
                    st = c.prepareStatement("select a.val, a.valref, b.freq from " + relName + " a inner join Domain_" + targetDomain + " b on a." + vA + " = b.val where a." + vB + " = ?");
                    st.setString(1, rootValue);
                    ResultSet rs = st.executeQuery();
                    vals = new ArrayList<>();
                    while (rs.next()) {
                        vals.add(rs.getString(vA));
                    }
                    valuesFromRefValue.put(cacheKey, vals);
                }
                if (vals.size() == 0) return null;
                return vals.get(rnd.nextInt(vals.size()));
            } else {
                // rootValue to be searched as valref in relName
                st = c.prepareStatement("select sum(freq) from " + relName + " a inner join Domain_" + targetDomain + " b on a." + vA + " = b.val where a." + vB + " = ?");
                st.setString(1, rootValue);
                int freqSum = st.executeQuery().getInt(1);
                if (freqSum <= 0) return "";
                st = c.prepareStatement("select a.val, a.valref, b.freq from " + relName + " a inner join Domain_" + targetDomain + " b on a." + vA + " = b.val where a." + vB + " = ?");
                st.setString(1, rootValue);
                ResultSet rs = st.executeQuery();
                int rIdx = rnd.nextInt(freqSum);
                int freqCumSum = 0;
                while (rs.next()) {
                    freqCumSum += rs.getInt("freq");
                    if (rIdx < freqCumSum) return rs.getString(vA);
                }
            }
        }

        return null;
    }

    /* Once one sourceDomain is chosen temporarly, that contains refValue, the research proceed with that.

       For example Bristol is both a first name and a city. So if we don't know where that value comes, it could be
       that First Name is tried first, trying from First Name to find Continent. But that is not possible, so the next
       domain that contains Bristol is tried: "City", and from there we can find Continent.

       */
    public static String generateValueFromRefValue(Connection c, String refValue, String targetDomain, Random rnd, boolean previewMode) throws SQLException {
        String rootValue;

        // Iterate through all domains
        Map<String, DomainInfo> availableDomains = getDomains(c, true, targetDomain);
        for (DomainInfo di : availableDomains.values()) {

            rootValue = findRootValue(c, refValue, di.domainName);
            if (rootValue == null) continue;

            // If the domain contains refValue, then we try to generate the targetDomain by using di.domainName as starting point
            String val = generateValueFromRefValue(c, refValue, di.domainName, targetDomain, rnd, previewMode);
            if (val != null) return val;
        }
        return null;
    }

}
