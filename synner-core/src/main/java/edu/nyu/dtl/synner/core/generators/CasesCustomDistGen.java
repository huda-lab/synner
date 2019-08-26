package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Arrays;

public class CasesCustomDistGen<T extends Comparable> extends CasesGen<T> {

    @JsonProperty
    private double[] ratios; // e.g. for categorical variable {M,F} [0.4, 0.6] means that 40% of the generated values will be M, and 60% will be F )


    private double[] probabilities;

    private double[] cdf;

    public CasesCustomDistGen(Generator<T>[] values, double[] ratios) {
        super(values);
        this.ratios = ratios;
        generateProbabilities();
        generateCdf();
    }

    @Override
    public T generate(boolean errorMode, boolean previewMode) throws Exception {
        return generators[select()].generate(errorMode, previewMode);
    }

    @Override
    public T generate(Comparable[] inputs, boolean errorMode, boolean previewMode) throws Exception {
        return generators[select()].generate(inputs, errorMode, previewMode);
    }

    private void generateProbabilities() {
        double ratiosTot = 0;
        for (int i = 0; i < ratios.length; i++)
            ratiosTot += ratios[i];

        double[] probabilities = new double[ratios.length];
        for (int i = 0; i < ratios.length; i++)
            probabilities[i] = ratios[i] / ratiosTot;

        this.probabilities = probabilities;
    }

    private void generateCdf() {
        cdf = new double[probabilities.length];
        cdf[0] = probabilities[0];
        for (int i = 1; i < probabilities.length; i++) cdf[i] = cdf[i - 1] + probabilities[i];
    }

    private int select() {
        double r = rnd.nextDouble();
        int sel = Arrays.binarySearch(cdf, r);
        if (sel < 0) { // transform the negative insertion point to the index where it can be found
            sel = Math.abs(sel + 1);
        }
        while (probabilities[sel] == 0.0) {
            sel--;
            if (sel < 0) sel = probabilities.length - 1;
        }
        return sel;
    }

}
