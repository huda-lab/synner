package edu.nyu.dtl.synner.core.generators;

import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.*;

public class CatGenTest {

    private static final double N = 10000;
    private static final Generator[] possibleValues1 = {val("A"), val("B"), val("C")};

    @Before
    public void setUp() throws Exception {

    }

    @After
    public void tearDown() throws Exception {

    }

    public static <T extends Comparable> Generator<T> val(T val) {
        return new ConstantGen<>(val);
    }

    @Test
    @Ignore
    public void checkCatGen() throws Exception {
        Generator<String> strGen = new CasesGen<>(possibleValues1);
        for (int i = 0; i < N; i++) {
            String genStr = strGen.generate(false, false);
            boolean found = false;
            for (Generator s : possibleValues1) {
                if (((ConstantGen)s).getConstant().equals(genStr)) found = true;
            }
            assertTrue(found);
        }
    }

    @Test
    @Ignore
    public void checkDistribution() throws Exception {
        double[] distribution = new double[] {0.2, 0.5, 0.3};
        CasesCustomDistGen g = new CasesCustomDistGen(possibleValues1, distribution);
        Map<String, Integer> collect = new HashMap<>();

        for (int i = 0; i < N; i++) {
            String val = (String) g.generate(false, false);
            if (collect.containsKey(val)) {
                int count = collect.get(val);
                collect.put(val, count + 1);
            } else {
                collect.put(val, 1);
            }
        }

        System.out.println(collect);

        for (int i = 0; i < possibleValues1.length; i++) {
            assertEquals(collect.get(possibleValues1[i]) / N, distribution[i], 0.01);
        }

    }

}