package edu.nyu.dtl.synner.core.infer;

import org.junit.*;

import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;

public class InferTest {

    @Before
    public void setUp() throws Exception {

    }

    @After
    public void tearDown() throws Exception {

    }

    private void testTemplate(List<String> values, String id, String contains) throws SQLException {
        InferRequest request = new InferRequest();
        request.setId(id);
        request.setValues(values);
        InferResponse response = Infer.infer(request);
        System.out.println(values);
        System.out.println(response.getInferredTypes());
    }

    @Test
    @Ignore
    public void testInfer() throws SQLException {
        List<String> values = Arrays.asList("Miro", "Marco","Jonathan","Nicholas","Abdul");
        testTemplate(values,"id1", "names/all");

        values = Arrays.asList("Mumbai", "Delhi", "Florence", "Smith");
        testTemplate(values,"id2", "cities/all");

        values = Arrays.asList("Karko", "Mirx", "Jokn");
        testTemplate(values,"id3", null);

        values = Arrays.asList("x", "s", "Mumbai");
        testTemplate(values,"id4", null);
    }
}