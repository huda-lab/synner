package edu.nyu.dtl.synner.api;

import com.amazonaws.AmazonServiceException;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.auth.BasicSessionCredentials;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper;
import com.amazonaws.services.dynamodbv2.model.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.nyu.dtl.synner.core.datamodel.GeneratedDataset;
import edu.nyu.dtl.synner.core.datamodel.Table;
import edu.nyu.dtl.synner.core.GeneratorInfo;
import edu.nyu.dtl.synner.core.generators.domain.DomainsManager;
import edu.nyu.dtl.synner.core.parser.DataParser;
import edu.nyu.dtl.synner.core.parser.RelationParser;
import edu.nyu.dtl.synner.core.infer.*;
import edu.nyu.dtl.synner.model.DownloadContact;
import edu.nyu.dtl.synner.model.RequestResponseMessage;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.StringReader;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class APIController {

    // synner-app user
    BasicAWSCredentials awsCreds = new BasicAWSCredentials(
            "AKIA2UC74TZPOBBLDN3A",
            "tAXRlq3awRh3QzUqj7mgGWeI9G7nWPM0haT/EH2L");
    final AmazonDynamoDB ddb = AmazonDynamoDBClientBuilder.standard()
            .withRegion(Regions.US_EAST_2)
            .withCredentials(new AWSStaticCredentialsProvider(awsCreds))
            .build();


    @ExceptionHandler
    void handleIllegalArgumentException(IllegalArgumentException e, HttpServletResponse response) throws IOException {
        response.sendError(HttpStatus.BAD_REQUEST.value());
    }

    @RequestMapping(value = "/generator", method = RequestMethod.POST)
    public @ResponseBody
    GeneratedDataset generator(@RequestBody String specifications, ServletRequest req, ServletResponse resp) throws Exception {
        StringReader strReader = new StringReader(specifications);

        ObjectMapper mapper = new ObjectMapper(new JsonFactory());
        JsonNode rootNode = mapper.readTree(strReader);

        Table rel = new RelationParser().readModel(rootNode.get("model"));

        boolean previewMode = rootNode.has("preview-mode") ? rootNode.get("preview-mode").asBoolean() : false;

        GeneratedDataset gdata = new DataParser().readModel(rel, rootNode.get("data"));
        gdata.generate(previewMode);

        return gdata;
    }

    @RequestMapping(value = "/generator", produces = "application/json", method = RequestMethod.GET)
    public @ResponseBody
    GeneratorInfo generator() throws IOException, SQLException {
        GeneratorInfo gi = new GeneratorInfo();
        Connection c = DomainsManager.getConnection();
        gi.setAvailableDomains(DomainsManager.getDomains(c, false, null));
        c.close();
        return gi;
    }

    @RequestMapping(value = "/generator.csv", produces = "application/json", method = RequestMethod.GET)
    public @ResponseBody
    String generatorCSV() throws IOException {
        return "this is a CSV";
    }

    @RequestMapping(value = "/generator.json", produces = "application/json", method = RequestMethod.GET)
    public @ResponseBody
    String generatorJSON() throws IOException {
        return "this is a JSON";
    }

    @RequestMapping(value = "/infer", produces = "application/json", method = RequestMethod.POST)
    public @ResponseBody
    List<InferResponse> infer(@RequestBody List<InferRequest> inferRequests) throws IOException, SQLException {
        List<InferResponse> inferResponses = new ArrayList<>();
        for (InferRequest infReq : inferRequests) {
            inferResponses.add(Infer.infer(infReq));
        }

        return inferResponses;
    }

    @RequestMapping(value = "/downloadrequest", produces = "application/json", method = RequestMethod.POST)
    public @ResponseBody
    RequestResponseMessage downloadRequest(@RequestBody DownloadContact contactDetails) throws IOException, SQLException {
        DynamoDBMapper mapper = new DynamoDBMapper(ddb);
        mapper.save(contactDetails);

        return new RequestResponseMessage("ok", "");
    }

}
