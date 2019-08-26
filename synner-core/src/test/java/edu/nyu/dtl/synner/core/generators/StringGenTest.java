package edu.nyu.dtl.synner.core.generators;

import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

import static org.junit.Assert.assertTrue;

public class StringGenTest {
    int N = 1000;

    @Before
    public void setUp() throws Exception {

    }

    @After
    public void tearDown() throws Exception {

    }

    @Test
    @Ignore
    public void checkGeneratedValues() throws Exception {
        String regexp = "[0-3]([a-c]|[e-g]{1,2})";
        StringGen strGen = new StringGen(regexp);

        for (int i = 0; i < N; i++) {
            String genStr = strGen.generate(false, false);
            assertTrue(genStr.matches(regexp));
        }

    }

}