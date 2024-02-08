package edu.nyu.dtl.synner.api;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.nyu.dtl.synner.core.datamodel.GeneratedDataset;
import edu.nyu.dtl.synner.core.datamodel.Table;
import edu.nyu.dtl.synner.core.GeneratorInfo;
import edu.nyu.dtl.synner.core.generators.domain.DomainsManager;
import edu.nyu.dtl.synner.core.parser.DataParser;
import edu.nyu.dtl.synner.core.infer.*;
import edu.nyu.dtl.synner.core.parser.RelationParser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.StringReader;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class APIController {

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

}
