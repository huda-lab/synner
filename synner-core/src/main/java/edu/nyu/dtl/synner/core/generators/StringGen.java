package edu.nyu.dtl.synner.core.generators;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mifmif.common.regex.Generex;

public class StringGen implements Generator<String> {

    private final Generex generex;

    @JsonProperty
    private final String regexp;

    public StringGen(String regexp) {
        this.regexp = regexp;
        generex = new Generex(regexp);
    }

    @Override
    public String generate(boolean errorMode, boolean previewMode) {
        if (errorMode) {
            char[] str = new char[rnd.nextInt(10) + 4];
            for (int i = 0; i < str.length; i++) str[i] = (char)(rnd.nextInt('z' - '0') + '0');
            return new String(str);
        }
        return generex.random();
    }

}
