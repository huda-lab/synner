Synner.service('Infer', ['Model', 'Parameters', 'API', '$timeout', function (Model, Parameters, API, $timeout) {

  // Infers the data type of a function based on user input
  this.inferDataType = function (field) {
    var noElements = true;

    for (let row = 0; row < Model.data.length; row++) {
      if (Model.data[row] === null || Model.data[row][field.id] === null || Model.data[row][field.id].l !== true) {
        continue;
      } else {
        noElements = false;
      }

      var val = Model.data[row][field.id].v;

      // First checks if it is a string
      if (isNaN(parseFloat(val))) {
        field.type = 'string';
        return;
      }

      // Then checks if it is a decimal
      if (val.toString().indexOf('.') > -1) {
        field.type = 'decimal';
        return;
      }
    }

    // Returns integer if the above 2 criteria are not met, but only if there is a value written by the user
    if (!noElements) field.type = 'integer';

  };

  this.inferFromData = function (field) {
    if (!field) return;

    var self = this;
    // this.inferDataType(field);
    if (field.inferReqTimeout) $timeout.cancel(field.inferReqTimeout);
    field.inferReqTimeout = $timeout(function () {
      var valuesToInfer = [];
      for (let row = 0; row < Model.data.length; row++) {
        if (Model.data[row] === null || Model.data[row][field.id] === null || Model.data[row][field.id].l !== true) continue;
        valuesToInfer.push(Model.data[row][field.id].v);
      }
      self.pushDefaultGenerator(valuesToInfer, field);
      if (valuesToInfer.length === 1 && typeof valuesToInfer[0] === 'string' && valuesToInfer[0].startsWith('=')) {
        field.inferOptions = [];
        field.inferOptions.push({
          title: "Function",
          type: "function",
          generator: {function: {value: valuesToInfer[0].substr(1), variables: []}}
        });
      }

      var req = [{
        id: field.id,
        fieldname: field.name,
        type: field.type,
        values: valuesToInfer
      }];
      API.infer(req, function (res) {
        let results = res[0]['inferred-types'];
        let examples = res[0]['examples'];
        field.inferOptions = [];
        for (let i = 0; i < results.length; i++) {
          field.inferOptions.push({
            title: results[i].title,
            type: 'domain',
            description: examples[i],
            generator: { domain: {name: results[i].id} }
          });
        }
        if (field.type === 'string') self.pushEnumerationCards(valuesToInfer, field.type, field);
        if (field.type === 'integer' || field.type === 'decimal') self.pushDistributionCards(valuesToInfer, field.inferOptions);
        if (field.type === 'time') self.pushTimeGeneratorsCards(valuesToInfer, field.inferOptions, field);
        if (field.type === 'date') self.pushDateGeneratorsCards(valuesToInfer, field.inferOptions, field);
      });

      field.inferReqTimeout = undefined;
    }, Parameters.INFER_DELAY);
  };

  this.pushDefaultGenerator = function (valuesToInfer, field) {
    var generator;

    if (field.type === 'string') {
      generator = {domain: {name:'NAME'}};
    } else if (field.type === 'time') {
      generator = {timerange: {from: 0, to: 1439}};
    } else if (field.type === 'date') {
      generator = {daterange: {
        from: (Date.now() - 100*24*60*60*1000) / (24*60*60*1000),
          to: Date.now() / (24*60*60*1000)
      }};
    } else {

      if (valuesToInfer.length === 0) {
        valuesToInfer = ['0', '100'];
      } else if (valuesToInfer.length === 1) {
        valuesToInfer = [parseFloat(valuesToInfer[0] + 10), parseFloat(valuesToInfer[0]) - 10];
      }

      var numbersList = this.strNumberListAsNumberList(valuesToInfer);

      generator = {
        distribution: "gaussian",
        mean: parseFloat(jStat.mean(numbersList).toFixed(2)),
        stdev: parseFloat(jStat.stdev(numbersList).toFixed(2))
      };
    }

    field.inferDefaultOption = generator;
    return generator;
  };

  this.pushEnumerationCards = function (valuesToInfer, fieldType, field) {
    if (valuesToInfer.length === 0) {
      if (fieldType === 'string') valuesToInfer = ['M', 'F'];
    }

    let dict = {};

    for (let k = 0; k < valuesToInfer.length; k++) {
      if (!(valuesToInfer[k] in dict)) dict[valuesToInfer[k]] = 0;
      dict[valuesToInfer[k]] += 1;
    }

    let dictKeys = Object.keys(dict);
    let details = [];
    let cases = [];
    let ratios = [];
    let len = Math.min(6, dictKeys.length);
    for (let j = 0; j < len; j++) {
      cases.push({value: dictKeys[j]});
      ratios.push(dict[dictKeys[j]]);
      details.push(dictKeys[j] + " : " + Math.round(100 * dict[dictKeys[j]] / valuesToInfer.length) + "%");
    }
    field.inferOptions.push({
      title: "Enumeration",
      type: "enumeration",
      description: details,
      generator: {cases: cases, ratios: ratios}
    });
  };

  this.pushTimeGeneratorsCards = function (valuesToInfer, fieldType, field) {
    field.inferOptions.push({
      title: "All Day",
      type: "time",
      description: ['15:08', '23:40', '08:12'],
      generator: {timerange: {from: 1, to: 1439}}
    });
    field.inferOptions.push({
      title: "Morning",
      type: "time",
      description: ['9:01', '11:43', '10:32'],
      generator: {timerange: {from: 1, to: 719}}
    });
    field.inferOptions.push({
      title: "Night",
      type: "time",
      description: ['19:08', '23:40', '16:34'],
      generator: {timerange: {from: 720, to: 1439}}
    });
  };

  this.pushDateGeneratorsCards = function (valuesToInfer, fieldType, field) {
    field.inferOptions.push({
      title: "Last Year",
      type: "date",
      description: [
        Model.strFormatDateFromDate(new Date(Date.now() - 200*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 100*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 250*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 50*24*60*60*1000))
      ],
      generator: {daterange: {
        from: (Date.now() - 365*24*60*60*1000) / (24*60*60*1000),
        to: Date.now() / (24*60*60*1000)
      }}
    });
    field.inferOptions.push({
      title: "Last 10 years",
      type: "date",
      description: [
        Model.strFormatDateFromDate(new Date(Date.now() - 5*365*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 3*300*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 2*250*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 4*50*24*60*60*1000))
      ],
      generator: {daterange: {
          from: (Date.now() - 10*365*24*60*60*1000) / (24*60*60*1000),
          to: Date.now() / (24*60*60*1000)
        }}
    });
    field.inferOptions.push({
      title: "Last 50 years",
      type: "date",
      description: [
        Model.strFormatDateFromDate(new Date(Date.now() - 10*365*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 20*300*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 30*250*24*60*60*1000)),
        Model.strFormatDateFromDate(new Date(Date.now() - 10*50*24*60*60*1000))
      ],
      generator: {daterange: {
          from: (Date.now() - 50*365*24*60*60*1000) / (24*60*60*1000),
          to: Date.now() / (24*60*60*1000)
        }}
    });
  };

  this.pushDistributionCards = function (valuesToInfer, inferOptionsArray) {

    if (valuesToInfer.length === 0) {
      this.pushDistributionCards(['0', '100'], inferOptionsArray);
      return;
    } else if (valuesToInfer.length === 1) {
      this.pushDistributionCards([parseFloat(valuesToInfer[0] + 10), parseFloat(valuesToInfer[0]) - 10], inferOptionsArray);
      return;
    }

    let numbersList = this.strNumberListAsNumberList(valuesToInfer);

    // Uniform Distribution
    inferOptionsArray.push({
      title: "Distribution: uniform",
      type: "distribution",
      description: [
        "Minimum: " + Math.floor(Math.min(...numbersList)),
        "Maximum: " + Math.ceil(Math.max(...numbersList))
      ],
      generator: {
        distribution: "uniform",
        min: Math.floor(Math.min(...numbersList)),
        max: Math.ceil(Math.max(...numbersList))
      }
    });

    var mean = parseFloat(jStat.mean(numbersList).toFixed(2));
    var std = parseFloat(jStat.stdev(numbersList).toFixed(2));

    // Gaussian Distribution
    inferOptionsArray.push({
      title: "Distribution: gaussian",
      type: "distribution",
      description: [
        "Mean: " + mean,
        "Std Dev: " + std
      ],
      generator: {
        distribution: "gaussian",
        mean: mean,
        stdev: std
      }
    });

    // Exponential Distribution
    inferOptionsArray.push({
      title: "Distribution: exponential",
      type: "distribution",
      description: [
        "Rate: " + (mean > 0 ? parseFloat((1 / mean).toFixed(2)) : 1)
      ],
      generator: {
        distribution: "exponential",
        rate: mean > 0 ? parseFloat((1 / mean).toFixed(2)) : 1
      }
    });

  };

  this.strNumberListAsNumberList = function (strNumList) {
    var numbersList = [];
    for (var i = 0; i < strNumList.length; i++) {
      numbersList.push(parseFloat(strNumList[i]));
    }
    return numbersList;
  };

  this.inferDistribution = function (field) {
    var samples = Model.getSamples(field);
    if (samples.length > 0) {
      var stats = jStat(samples);
      return stats.stdev() > 0 ? stats : null;
    }
    return null;
  };

  // Creating a new link the default link generator is a function. This analyses the current field generator and the
  // dependencies of the new link in order to suggest the best generator for this new link
  this.inferLinkGenerator = function (field) {
    var targetGenerator = field._generator.obj;
    if (field.dependencies.length === 1 &&
        Model.isDomain(field.dependencies[0]._generator.obj) &&
        Model.isDomain(targetGenerator)) {
      field._generator.obj = {'natural-join': targetGenerator};
    }
  };

  // analyse the field and if that is a domain it retrieves all the possible domain that can be linked to the field's domain
  this.getFieldSubdomains = function (field) {
    if (!field) return [];
    var gen = Model.getGeneratorWithoutSwitch(field);
    if(!Model.isDomain(gen)) return [];
    var domain = gen.domain.name;
    var res = [];
    for (var sd of Parameters.AVAILABLE_DOMAINS[domain].subdomains) {
      res.push({id: sd, domain: Parameters.AVAILABLE_DOMAINS[sd]});
    }
    return res;
  }


}])
;
