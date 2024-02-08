package edu.nyu.dtl.synner.core.generators;

import com.opencsv.exceptions.CsvValidationException;
import edu.nyu.dtl.synner.core.generators.domain.DomainGen;
import edu.nyu.dtl.synner.core.generators.domain.DomainInfo;
import edu.nyu.dtl.synner.core.generators.domain.DomainsManager;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.Random;

public class DomainGenTest {

    @Before
    public void setUp() throws Exception {

    }

    @After
    public void tearDown() throws Exception {

    }

    @Test
    @Ignore
    public void loadData() throws SQLException, CsvValidationException {
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/cities.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/continents.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/continents-regions.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/countries.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/countries-cities.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/regions.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/regions-countries.csv"));
//
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/female.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/female-rel.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/male.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/male-rel.csv"));
//
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/surname.csv"));

//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/boolean.csv"));


        DomainsManager.readDescriptionInput(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/descr.csv"));

//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("db_creation/0.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/1.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/2.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/3.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/4.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/c1.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/c2.csv"));
//        DomainsManager.loadDataset(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/c3.csv"));
//        DomainsManager.readDescriptionInput(DomainGen.class.getClassLoader().getResourceAsStream("predefined-domains/desc.csv"));
    }

    @Test
    @Ignore
    public void produceRandomData() throws SQLException {
        Connection c = DomainsManager.getConnection();

        Random rnd = new Random();

        for (int i = 0; i < 1000000; i++) {
            System.out.println(DomainsManager.getRandomValue(c, "city", rnd) + " ");
        }

//        for (int i = 0; i < 10; i++) {
//            System.out.println(DomainsManager.generateValueFromRefValue(c, "Male", "NAME", new Random()));
//        }
//
//        for (int i = 0; i < 10; i++) {
//            System.out.println(DomainsManager.generateValueFromRefValue(c, "Girl", "NAME", new Random()));
//        }

//        for (int i = 0; i < 10; i++) {
//            System.out.println(DomainsManager.generateValueFromRefValue(c, "Tai", "GENDER", new Random()));
//        }


//        System.out.println(DomainsManager.getDirectReachableDomainsFromDomain(c, "COUNTRY"));

//        System.out.println(DomainsManager.findPath(c,"CONTINENT","CITY",new ArrayList<>()));
//        System.out.println(DomainsManager.findPath(c,"REGION","CITY",new ArrayList<>()));
//        System.out.println(DomainsManager.findPath(c,"REGION","PROVINCE",new ArrayList<>()));
//        List<String> path = DomainsManager.findPath(c,"CONTINENT","PROVINCE",new ArrayList<>());
//        String lastValue = DomainsManager.getRandomValue(c, path.get(0), DomainsManager.getFreqSum(c, path.get(0)), rnd);
//        for (int i = 1; i < path.size(); i++) {
//            lastValue = DomainsManager.generateValueFromRefValue(c, lastValue, path.get(i - 1), path.get(i), rnd);
//            System.out.println(path.get(i - 1) + " " + path.get(i) + " -> " + lastValue);
//
//        }


//
//        for (int i = 0; i < 10; i++) {
//            System.out.println(DomainsManager.generateValueFromRefValue(c, "Africa", "PROVINCE", rnd));
//        }
//
//        for (int i = 0; i < 10; i++) {
//            System.out.println(DomainsManager.generateValueFromRefValue(c, "Gauteng", "COUNTRY", rnd));
//        }
//        System.out.println(DomainsManager.findPath(c,"PROVINCE","COUNTRY",new ArrayList<>()));

        c.close();
    }

    @Test
    @Ignore
    public void getAvailableDomains() throws SQLException {
        Connection c = DomainsManager.getConnection();

        Random rnd = new Random();
        int freqSum = DomainsManager.getFreqSum(c, "NAME");


        Map<String, DomainInfo> availableDomains = DomainsManager.getDomains(c, false, null);
        for (DomainInfo di : availableDomains.values()) {
            System.out.println("Domain: " + di.getName());
            System.out.println("Subdomains: " + di.getSubdomains());
            System.out.println("Reachable Domains: " + DomainsManager.getDomains(c, false, di.getName()));
        }

        c.close();

    }




}