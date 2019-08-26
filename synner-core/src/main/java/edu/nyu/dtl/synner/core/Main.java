package edu.nyu.dtl.synner.core;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.nyu.dtl.synner.core.datamodel.Field;
import edu.nyu.dtl.synner.core.datamodel.GeneratedDataset;
import edu.nyu.dtl.synner.core.datamodel.Relationship;
import edu.nyu.dtl.synner.core.datamodel.Table;
import edu.nyu.dtl.synner.core.parser.DataParser;
import edu.nyu.dtl.synner.core.parser.RelationParser;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

public class Main {

    public static void main(String[] args) throws Exception {
        File test1 = new File(args[0]);
        FileReader test1Reader = new FileReader(test1);

        ObjectMapper mapper = new ObjectMapper(new JsonFactory());
        JsonNode rootNode = mapper.readTree(test1Reader);

        Table rel = new RelationParser().readModel(rootNode.get("model"));

        Set<Field> fields = rel.getFields();
        System.out.println("Fields: " + fields);

        // Just to print it, but they are sorted in Table's constructor
        List<Field> topSort = Relationship.topologicalSort(fields);
        System.out.println("Topological sort: " + topSort);

        System.out.println("\nGeneration examples: ");
        GeneratedDataset gdata = new DataParser().readModel(rel, rootNode.get("data"));
        gdata.generate(false);

        GeneratedDataset.DataField[][] data = gdata.getData();
        System.out.println(rel.getFields());
        for (int i = 0; i < data.length; i++) {
            System.out.print("[");
            for (int j = 0; j < data[i].length; j++) {
                System.out.print(data[i][j].data);
                if (j < data[i].length - 1) System.out.print(", ");
            }
            System.out.println("]");
        }
    }
}