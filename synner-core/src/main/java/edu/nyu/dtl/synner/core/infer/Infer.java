package edu.nyu.dtl.synner.core.infer;

import edu.nyu.dtl.synner.core.datamodel.ColumnType;
import edu.nyu.dtl.synner.core.generators.domain.DomainInfo;
import edu.nyu.dtl.synner.core.generators.domain.DomainsManager;
import info.debatty.java.stringsimilarity.Levenshtein;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.*;

public class Infer {

    private static final int RETURN_SIZE = 3;
    private static final int NUM_EXAMPLES = 5;
    private static final double DISTANCE_THRESHOLD = 0.5;

    /**
     * Infer the the values in the request.
     *
     * @param req the request contains the values to infer.
     *
     * @return the inferred types. Inferred types can be more than one, and sorted by importance
     *         (the firsts better than the lasts).
     */
    public static InferResponse infer(InferRequest req) throws SQLException {
        Connection c = DomainsManager.getConnection();
        InferResponse res = new InferResponse(req);
        Map<String, DomainInfo> availableDomains = DomainsManager.getDomains(c);
        Random random = new Random();

        if (req.getTypeAsColumnType() == ColumnType.STR) {

            List<DomainInfo> inferredByName = inferByName(availableDomains, req.fieldName);
            for (DomainInfo di : inferredByName) {
                res.inferredTypes.add(new InferType(di.getName(), di.getReadableName()));
                List<String> examples = new ArrayList<>();
                List<String> words = DomainsManager.getValues(c, di.getName());
                for (int q = 0; q < NUM_EXAMPLES; q++) {
                    examples.add(words.get(random.nextInt(words.size())));
                }
                res.examples.add(examples);
            }

            ArrayList<DomainDetail> domainDetailList = findMatchesInDomains(c, availableDomains, req, true, null);
            if (domainDetailList.size() < RETURN_SIZE - inferredByName.size()) {
                domainDetailList.addAll(kNearestNeighbors(c, availableDomains, req, domainDetailList));
            }

            Collections.sort(domainDetailList);
            Collections.reverse(domainDetailList);

            Map<String, Integer> domainCount = new HashMap<>();

            // Put all the inferred types back to the request
            for (DomainDetail item : domainDetailList) {
                if (!domainCount.containsKey(item.domain)) {
                    domainCount.put(item.domain, 0);
                }
                int count = domainCount.get(item.domain);
                domainCount.replace(item.domain, count + 1);

                if (count >= 2) continue;
                if (!res.inferredTypes.contains(item.domain)) {
                    res.inferredTypes.add(new InferType(item.domain, item.domainReadableName));
                    res.examples.add(item.examples);
                }
                if (res.inferredTypes.size() >= RETURN_SIZE - inferredByName.size()) break;
            }

        }

        c.close();

        return res;
    }

    private static List<DomainInfo> inferByName(Map<String, DomainInfo> availableDomains, String fieldName) {
        List<DomainInfo> res = new ArrayList<>();
        if (fieldName.isEmpty()) return res;

        fieldName = fieldName.toLowerCase();
        for (DomainInfo domain : availableDomains.values()) {
            String domainName = domain.getName().toLowerCase();
            if (domainName.contains(fieldName) || fieldName.contains(domainName)) {
                res.add(domain);
            }
        }

        return res;
    }

    /**
     * Helper function for infer
     *
     * @param availableDomains
     * @param exactMatch determines whether exact matches are found (if this is true)
     *                   or whether a string similarity measure (kNN) is used (if false)
     * @param exludeList
     */

    private static ArrayList<DomainDetail> findMatchesInDomains(Connection c, Map<String, DomainInfo> availableDomains,
                InferRequest req, boolean exactMatch, ArrayList<DomainDetail> exludeList) throws SQLException {

        Random random = new Random();
        ArrayList<DomainDetail> domainDetailList = new ArrayList<>();

        l: for (DomainInfo domain : availableDomains.values()) {
            if (exludeList != null) {
                for (DomainDetail dd : exludeList) {
                    if (dd.domain.equals(domain.getName())) continue l;
                }
            }
            List<String> words = DomainsManager.getValues(c, domain);
            List<String> examples = new ArrayList<>();
            int count = 0;
            int userItemsAsExamples = 2;
            Double minScore = 1.0;

            if (exactMatch) {
                for (String item : req.getValues()) {
                    if (!words.contains(item)) break;
                    count = count + 1;
                    if (userItemsAsExamples > 0) {
                        examples.add(item);
                        userItemsAsExamples--;
                    }
                }
                if (count == 0) continue;
            } else {
                for (String item : req.getValues()) {
                    for (String word : words) {
                        Double score = computeDistance(item, word);
                        if (score < minScore) minScore = score;
                    }
                }
                if (minScore >= DISTANCE_THRESHOLD) continue;
            }

            int toinsert = NUM_EXAMPLES - examples.size();
            for (int q = 0; q < toinsert; q++) {
                examples.add(words.get(random.nextInt(words.size())));
            }
            domainDetailList.add(new DomainDetail(domain.getName(), domain.getReadableName(), count, minScore, examples));

        }

        if (domainDetailList.isEmpty()) {
            Random rnd = new Random();
            List<DomainInfo> domainsList = new ArrayList<>(availableDomains.values());
            for (int i = 0; i < 3; i++) {
                int rndPos = rnd.nextInt(domainsList.size());
                DomainInfo domain = domainsList.get(rndPos);
                domainsList.remove(rndPos);
                List<String> examples = new ArrayList<>();
                for (int q = 0; q < NUM_EXAMPLES; q++) {
                    examples.add(DomainsManager.getRandomValue(c, domain.getName(), rnd));
                }
                domainDetailList.add(new DomainDetail(domain.getName(), domain.getReadableName(), 0, 0.0, examples));
            }
        }

        return domainDetailList;
    }

    private static ArrayList<DomainDetail> kNearestNeighbors(Connection c, Map<String, DomainInfo> availableDomains,
                                InferRequest req, ArrayList<DomainDetail> exludeList) throws SQLException {
        return findMatchesInDomains(c, availableDomains, req, false, exludeList);
    }

    private static double computeDistance(String item, String word) {
        Levenshtein l = new Levenshtein();
        return l.distance(item, word) / (double) item.length();
    }
}
