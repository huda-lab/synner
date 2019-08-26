Synner.service('Model', ['Parameters', 'API', '$timeout', '$rootScope', function (Parameters, API, $timeout, $rootScope) {

  document.model = this;

  this.fields = [

    {
      id: 0, // used to have a way to identify the field (the name can be modified)
      name: 'Name',
      type: 'string', // the type of the field, which can be 'string', 'integer', 'decimal', or 'enum'
      dependencies: [],
      _generator: {obj: {switch: [{default: {domain: {name: "NAME"}, join: "Gender"}}]}} // contains the description of how to generate this field (in the field 'value')
    },
    {
      id: 1,
      name: 'Surname',
      type: 'string',
      dependencies: [],
      _generator: {obj: {switch: [{default: {domain: {name: "SURNAME"}}}]} }
    },
    {
      id: 2,
      name: 'Sex',
      type: 'string',
      dependencies: [],
      _generator: {obj: {switch: [{default: {domain: {name: "SEX"}}}]} }
    },
    {
      id: 3,
      name: 'Age',
      type: 'integer',
      dependencies: [],
      _generator: {obj: {switch: [{default: {distribution: "uniform", min: 0, max: 42}}]}}
    },
    {
      id: 4,
      name: 'Height',
      type: 'integer',
      dependencies: [],
      _generator: {obj: {switch: [{default: {distribution: "uniform", min: 0, max: 42}}]}}
    }


    // {
    //   id: 0, // used to have a way to identify the field (the name can be modified)
    //   name: 'Name',
    //   type: 'string', // the type of the field, which can be 'string', 'integer', 'decimal', or 'enum'
    //   dependencies: [],
    //   _generator: {obj: {domain: "surnames/all"}} // contains the description of how to generate this field (in the field 'value')
    // },
    // {
    //   id: 1,
    //   name: 'Age',
    //   type: 'integer',
    //   dependencies: [],
    //   _generator: {obj: {distribution: "gaussian", mean: 27, stdev: 3}}
    // },
    // {
    //   id: 2,
    //   name: 'Gender',
    //   type: 'string',
    //   dependencies: [],
    //   _generator: {obj: {cases: [{value: "M"}, {value: "F"}], ratios: [1, 1]}}
    // },
    // {
    //   id: 3,
    //   name: 'Height',
    //   type: 'decimal',
    //   dependencies: [],
    //   _generator: {obj: {distribution: "gaussian", mean: 170, stdev: 10}}
    // },
    // {id: 4, name: 'Country', type: 'string', dependencies: [], _generator: {obj: {domain: "countries/all"}}},
    // {id: 5, name: 'City', type: 'string', dependencies: [], _generator: {obj: {domain: "cities/all"}}},
    // {
    //   id: 6,
    //   name: 'Weight',
    //   type: 'integer',
    //   dependencies: [],
    //   _generator: {obj: {distribution: "gaussian", mean: 70, stdev: 20}}
    // },
    // {
    //   id: 7,
    //   name: 'BirthDate',
    //   type: 'time',
    //   dependencies: [],
    //   _generator: {obj: {'function': '42'}}
    // }
  ];
  this.fields[0].dependencies.push(this.fields[2]);
  this.fields[4].dependencies.push(this.fields[3]);

  this.dataVolume = 1000; // The amount of data to generate
  this.experimentsNumber = 20; // The amount of experiments to do in case of outcome prediction (e.g. distribution graph)

  // Number of rows to display in the interface as example
  this.defaultDataRows = 10;
  this.dataRows = 10;

  this.haltGeneration = false;

  this.data = [
    // [{v: 'Miro', l: true}, null, {v: 'M', l: true}, {v: 179, l: true}, null, null, null, null],
    // [{v: 'Marco', l: true}, null, {v: 'M', l: true}, {v: 175, l: true}, null, null, null, null],
    // [null, null, {v: 'F', l: true}, {v: 156, l: true}, null, null, null, null],
    // [null, null, {v: 'F', l: true}, null, null, null, null, null]
  ];

  this.getSamples = function (field) {
    var samples = [];
    for (var i = 0; i < this.data.length; i++) {
      var val = this.data[i][field.id];
      if (val && val.v !== null) samples.push(val.v);
    }
    return samples;
  };

  /*
      newData false if it is the first time generating data
      if newData is ture then the backend will only add new data on top of the model.data
   */
  this.getGenerationRequest = function (newData, numRows) {
    var generationRequest = {
      model: {},
      data: {
        'to-add': 0,
        tuples: []
      },
      'preview-mode': true,
      format: 'json'
    };
    for (var field of this.fields) {
      var dependenciesNames = [];
      for (var dep of field.dependencies) {
        dependenciesNames.push(dep.name);
      }
      generationRequest.model[field.name] = {
        pos: field.id,
        type: field.type,
        filter: field.filter,
        errorRows: field.errorRows,
        missingRows: field.missingRows,
        dependencies: dependenciesNames,
        generator: field._generator.obj
      };
    }
    if (newData) {
      // only generate new data, without caring about past values
      generationRequest.data['to-add'] = numRows;
    } else {
      var dl = Math.min(numRows, this.data.length);
      for (var tdx = 0; tdx < dl; tdx++) {
        var tuple = this.data[tdx], nonNullValue = false;
        var reqTuple = [];
        for (var idx = 0; idx < tuple.length; idx++) {
          var dt = tuple[idx];
          var field = this.fields[idx];
          if (dt === null || dt.l === false) {
            reqTuple.push(null);
          } else {
            nonNullValue = true;
            var v = dt.v;
            if (field.type === 'integer' || field.type === 'decimal') v = parseFloat(v);
            else if (field.type === 'time') v = this.getIntFromTime(v);
            else if (field.type === 'date') v = this.getIntFromDate(v);
            reqTuple.push(v);
          }
        }
        if (nonNullValue) {
          generationRequest.data.tuples.push(reqTuple);
        }
      }

      if (generationRequest.data.tuples.length < numRows) {
        generationRequest.data['to-add'] = numRows - generationRequest.data.tuples.length;
      }

    }

    return generationRequest;
  };

  this.changeFieldType = function (fieldId) {
    this.fields[fieldId]._generator.obj = undefined;
    this.fields[fieldId].inferDefaultOption = undefined;
    this.fields[fieldId].inferOptions = [];
    this.clearValues(fieldId);
  };

  var genSeq = 0, dataGenerationReqTimeout;
  this.requestNewDataGeneration = function () {
    var model = this;
    if (model.haltGeneration) return;
    genSeq = 0;

    if (dataGenerationReqTimeout !== null) {
      clearTimeout(dataGenerationReqTimeout);
    }

    dataGenerationReqTimeout = setTimeout(function () {
      dataGenerationReqTimeout = null;
      genSeq = 0;
      model.generateSamples();
    }, Parameters.GENERATION_DELAY);

  };

  this.generateSamples = function () {
    var model = this;
    $rootScope.$emit('DATA_UPDATE_START');
    $rootScope.$emit('DATA_RESET');
    var req = this.getGenerationRequest(false, this.defaultDataRows);
    if (req !== null) {
      API.generate(req, function (res) {
        model.generationError = null;
        model.updateData(res.data);
        $rootScope.$emit('DATA_UPDATE_END');
        model.generateCompletePreview();
      }, function (res) {
        model.generationError = res.data.message;
        $rootScope.$emit('DATA_UPDATE_END');
      })
    }
  };

  this.addRows = function (num) {
    var rowsToAdd = !num ? Parameters.ROWS_TO_PROGRESSIVELY_ADD : num;
    var model = this;
    $rootScope.$emit('DATA_UPDATE_START');
    var req = this.getGenerationRequest(true, rowsToAdd);
    if (req !== null) {
      API.generate(req, function (res) {
        model.updateData(res.data, model.data.length);
        $rootScope.$emit('DATA_UPDATE_END');
        model.generateCompletePreview();
      })
    }
  };

  // To add more data to the interface after updating the first rows to guarantee responsiveness
  this.generateCompletePreview = function () {
    var model = this;
    if (this.data.length < Parameters.MAX_INTERFACE_DATA_VOLUME) {
      var timeout = Parameters.COMPLETE_PREVIEW_INIIAL_GENERATION_DELAY;
      if (genSeq > 0) { // first time 1 sec, after proportional to genSeq
        timeout = genSeq * Parameters.COMPLETE_PREVIEW_GENERATION_DELAY;
      }
      genSeq++;
      if (dataGenerationReqTimeout) {
        clearTimeout(dataGenerationReqTimeout);
      }
      dataGenerationReqTimeout = setTimeout(function () {
        dataGenerationReqTimeout = null;
        model.addRows(Parameters.ROWS_TO_PROGRESSIVELY_ADD);
      }, timeout);
    }
  };

  this.addNewColumn = function (type) {
    var newField = {
      id: this.fields.length,
      name: 'column' + (this.fields.length + 1),
      type: type,
      dependencies: [],
      _generator: {obj: null /* generator */}
    };
    this.fields.push(newField);
    for (var row of this.data) row.push(null);
    return newField;
  };

  this.hideColumn = function (id) {
    this.fields[id].hidden = !this.fields[id].hidden;
  };

  this.removeColumn = function (id) {
    for (var f of this.fields) {
      for (var idx = f.dependencies.length - 1; idx >= 0; idx--) {
        if (f.dependencies[idx].id === id) {
          f.dependencies.splice(idx, 1);
        }
      }
    }

    for (var i = id + 1; i < this.fields.length; i++) {
      this.fields[i].id--;
    }

    this.fields.splice(id, 1);

    for (var i = 0; i < this.data.length; i++) {
      this.data[i].splice(id, 1);
    }

    if (this.fields.length === 0) {
      this.addNewColumn('string');
    }

  };

  this.getValueFromBackendValue = function (v, colType) {
    if (colType === 'decimal') {
      return v === null ? null : parseFloat((v).toFixed(2));
    } else if (colType === 'time') {
      return this.getTimeFromInt(v);
    } else if (colType === 'date') {
      return this.getDateFromInt(v);
    } else {
      return v;
    }
  };

  this.addDataTimeout = null;
  this.addData = function (newData) {

    // var self = this;
    //
    // if (this.addDataTimeout !== null) {
    //   clearTimeout(this.addDataTimeout);
    //   this.addDataTimeout = null;
    // }
    //
    // function addDataPartialAsync(newData, offset, length) {
    //   var end = false;
    //
    //   if (offset + length > newData.length) {
    //     length = newData.length - offset;
    //     end = true;
    //   }
    //
    //   for (var row_i = offset; row_i < offset + length; row_i++) {
    //     var newRow = [];
    //     for (var col_i = 0; col_i < newData[row_i].length; col_i++) {
    //       newRow.push({
    //         l: false,
    //         s: newData[row_i][col_i].s,
    //         v: self.getValueFromBackendValue(newData[row_i][col_i].v, self.fields[col_i].type)
    //       });
    //     }
    //     self.data.push(newRow);
    //   }
    //
    //   if (!end) {
    //     self.addDataTimeout = setTimeout(function () {
    //       self.addDataTimeout = null;
    //       addDataPartialAsync(newData, offset + length, 100);
    //       $rootScope.$apply();
    //     }, 1);
    //   }
    // }
    //
    // addDataPartialAsync(newData, 0, 100);

    // everything above is the async version that iteratively updates while doing yield of the code below
    for (var row_i = 0; row_i < newData.length; row_i++) {
      var newRow = [];
      for (var col_i = 0; col_i < newData[row_i].length; col_i++) {
        newRow.push({
          l: false,
          s: newData[row_i][col_i].s,
          v:this.getValueFromBackendValue(newData[row_i][col_i].v, this.fields[col_i].type)
        });
      }
      this.data.push(newRow);
    }
  };

  this.updateData = function (results, offset) {
    if (offset === undefined) offset = 0;

    for (var row_i = 0; row_i < results.length; row_i++) {
      if (row_i + offset >= this.data.length) {
        break;
        // var newTuple = [];
        // for (var i = 0; i < results[row_i].length; i++) newTuple.push(null);
        // this.data.push(newTuple);
      }
      for (var col_i = 0; col_i < results[row_i].length; col_i++) {
        if (this.data[row_i + offset][col_i] === null) this.data[row_i + offset][col_i] = {l: false};
        this.data[row_i + offset][col_i].s = results[row_i][col_i].s;
        this.data[row_i + offset][col_i].v = this.getValueFromBackendValue(results[row_i][col_i].v, this.fields[col_i].type);
      }
    }

    if (results.length + offset > this.data.length) {
      this.addData(results.splice(row_i));
    } else if (this.data.length > results.length + offset) {
      this.data.splice(results.length);
    }
  };

  this.getGeneratorWithoutSwitch = function (field) {
    var gen = field._generator.obj;
    if (this.isSwitch(gen) && gen.switch.length === 1 && gen.switch[0].default) {
      gen = gen.switch[0].default;
    }
    return gen;
  };

  this.getCompatibleFields = function (field) {
    var compatibleFields = [];
    for (var f of this.fields) {
      // exclude link to the same node
      if (f.id === field.id) continue;

      // exclude duplicate links
      if (this.fieldHasDependency(field.id, f.id)) continue;

      compatibleFields.push(f);
    }
    return compatibleFields;
  };

  this.clearValues = function (id) {
    for (var row of this.data) row[id] = null;
  };

  this.isRegExp = function (generator) {
    return generator && 'regexp' in generator;
  };

  this.isSingleValue = function (generator) {
    return generator && 'value' in generator;
  };

  this.isCases = function (generator) {
    return generator && 'cases' in generator;
  };

  this.isDistribution = function (generator) {
    return generator && 'distribution' in generator;
  };

  this.isFunction = function (generator) {
    return generator && 'function' in generator;
  };

  this.isTimeRange = function (generator) {
    return generator && 'timerange' in generator;
  };

  this.isDateRange = function (generator) {
    return generator && 'daterange' in generator;
  };

  this.isVisualRelationship = function (generator) {
    return generator && 'visrel' in generator;
  };

  this.isSwitch = function (generator) {
    return generator && 'switch' in generator;
  };

  this.isDomain = function (generator) {
    return generator && 'domain' in generator;
  };

  // in Synner we store a time as integer, indicating the number of minutes after midnight
  this.getIntFromTime = function (date) {
    return date.getHours() * 60 + date.getMinutes();
  };
  this.getTimeFromInt = function (minutesFromMidnight) {
    var d = new Date(minutesFromMidnight * 60 * 1000);
    return new Date(minutesFromMidnight * 60 * 1000 + d.getTimezoneOffset() * 60000)
  };
    this.strFormatTimeFromTime = function (date) {
    return date.getHours() + ':' + date.getMinutes();
  };

  this.getIntFromDate = function (date) {
    return date.getTime() / 60 / 60 / 24 / 1000;
  };
  this.getDateFromInt = function (daysFromEpoch) {
    return new Date(daysFromEpoch * 24 * 60 * 60 * 1000)
  };
  this.strFormatDateFromDate = function (date) {
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
  };

  this.getFieldModalities = function (field) {
    var modalities = [];

    if (field.type === 'string') {
      modalities = [
          {v: 'enumeration', descr: 'Enumeration'},
          {v: 'domain', descr: 'Domain'},
          {v: 'function', descr: 'Expression'},
          {v: 'sequence', descr: 'Sequence'}
      ];
    } else if (field.type === 'decimal' || field.type === 'integer') {
      modalities = [
          {v: 'distribution', descr: 'Distribution'},
          {v: 'enumeration', descr: 'Enumeration'},
          {v: 'function', descr: 'Expression'}
      ];

      if (field.dependencies.length > 0) {
        for (var dep of field.dependencies) {
          if (dep.type === 'decimal' || dep.type === 'integer') {
            modalities.push({v: 'visrel', descr: 'Visual Relationship'});
            break;
          }
        }
      }

      modalities.push({v: 'sequence', descr: 'Sequence'});

    } else if (field.type === 'time') {
      modalities = [
        {v: 'function', descr: 'Expression'},
        {v: 'timerange', descr: 'Time Range'},
        {v: 'sequence', descr: 'Sequence'}
      ];
    } else if (field.type === 'date') {
      modalities = [
        {v: 'function', descr: 'Expression'},
        {v: 'daterange', descr: 'Date Range'},
        {v: 'sequence', descr: 'Sequence'}
      ];
    }

    return modalities;
  };

  this.deleteFieldData = function (field) {
    for (var row_i = 0; row_i < this.data.length; row_i++) {
      this.data[row_i][field.id].l = false;
      this.data[row_i][field.id].v = null;
    }
  };

  this.filterNumericFields = function (fields) {
    var numericFields = [];
    for (var dep of fields) {
      if (dep.type === 'integer' || dep.type === 'decimal') numericFields.push(dep);
    }
    return numericFields;
  };

  this.getFieldGeneratorModality = function (field) {
    if (field.type === 'string') {
      if (this.isFunction(field._generator.obj)) return 'function';
      if (this.isDomain(field._generator.obj)) return 'domain';
      return 'enumeration';
    } else if (field.type === 'decimal' || field.type === 'integer') {
      if (this.isFunction(field._generator.obj)) return 'function';
      if (this.isCases(field._generator.obj)) return 'enumeration';
      return 'distribution';
    }
  };

  // It creates a new link or use
  this.addDependency = function (fieldId, dependencyId) {
    var field = this.fields[fieldId];
    if (!field) return false;
    var dependency = this.fields[dependencyId];
    if (!this.fieldHasDependency(field.id, dependency.id)) {
      field.dependencies.push(dependency);
    }
  };

  this.removeDependencyFromField = function (fieldId, dependencyId) {
    var field = this.fields[fieldId];
    var dependency = this.fields[dependencyId];

    for (var i = 0; i < field.dependencies.length; i++) {
      if (field.dependencies[i].id === dependency.id) {
        field.dependencies.splice(i, 1);
        break;
      }
    }

    // TODO Set the generator to null if incompatibile
  };

  this.fieldHasDependency = function (fieldId, dependencyId) {
    var field = this.fields[fieldId];
    var dependency = this.fields[dependencyId];

    for (var i = 0; i < field.dependencies.length; i++) {
      if (field.dependencies[i].id === dependency.id) {
        return true;
      }
    }
    return false;
  };

}]);

Synner.filter('numericFields', function () {
  return function (fields) {
    var filteredFields = [];
    for (var f of fields) {
      if (f.type === 'integer' || f.type === 'decimal') filteredFields.push(f);
    }
    return filteredFields;
  };
});
