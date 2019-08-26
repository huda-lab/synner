package edu.nyu.dtl.synner.core.generators;

import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

import static org.junit.Assert.*;

public class ConditionalGenTest {

    private static final int N = 100;

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
    public void functionMap() throws Exception {
        Generator<String> gen = new FunctionGenerator<>("x / 2");
        assertEquals(2d, gen.generate(new Comparable[]{4}, false, false));
    }

}