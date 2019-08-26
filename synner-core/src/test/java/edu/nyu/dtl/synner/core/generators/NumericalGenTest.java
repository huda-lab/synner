package edu.nyu.dtl.synner.core.generators;

import edu.nyu.dtl.synner.core.generators.numerical.GaussianGen;
import org.junit.*;

public class NumericalGenTest {
    private static final int N = 10000;
    private static final int ISTOGRAM_BUCKETS = 1000;

    @Before
    public void setUp() throws Exception {

    }

    @After
    public void tearDown() throws Exception {

    }

    @Test
    @Ignore
    public void gaussianTest() throws Exception {
        int mean = 50;
        int std = 10;

        GaussianGen ngg = new GaussianGen(mean, std);
        int[] frequencies = new int[ISTOGRAM_BUCKETS + 1];
        for (int i = 0; i < frequencies.length; i++) frequencies[i] = 0;

        double[] values = new double[N];
        double max = Double.MIN_VALUE, min = Double.MAX_VALUE;
        for (int i = 0; i < N; i++) {
            values[i] = ngg.generate(false, false);
            if (values[i] > max) max = values[i];
            if (values[i] < min) min = values[i];
        }

        for (int i = 0; i < N; i++) {
            int pos = (int) (((values[i] - min) / (max - min)) * ISTOGRAM_BUCKETS);
            frequencies[pos]++;
        }

        int stdMinPos = (int) (((mean - std - min) / (max - min)) * ISTOGRAM_BUCKETS);
        int stdMaxPos = (int) (((mean + std - min) / (max - min)) * ISTOGRAM_BUCKETS);
        int sum = 0;
        for (int i = stdMinPos; i < stdMaxPos; i++) {
            sum += frequencies[i];
        }
        Assert.assertEquals(0.34 * 2, sum / (double) N, 0.01);

        int std2MinPos = (int) (((mean - std * 2 - min) / (max - min)) * ISTOGRAM_BUCKETS);
        int std2MaxPos = (int) (((mean + std * 2 - min) / (max - min)) * ISTOGRAM_BUCKETS);
        sum = 0;
        for (int i = std2MinPos; i < std2MaxPos; i++) {
            sum += frequencies[i];
        }
        Assert.assertEquals(0.34 * 2 + 0.14 * 2, sum / (double) N, 0.01);
    }

}