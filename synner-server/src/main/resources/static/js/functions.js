Synner.service('Functions', ['Model', 'Parameters', '$timeout', function (Model, Parameters, $timeout) {

  this.extractUsedFields = function (functionExpression, field) {
    var usedFields = [];
    var compatibleFields = Model.getCompatibleFields(field);
    var parsedExpression = esprima.parse(functionExpression, {tokens: true});
    for (var t of parsedExpression.tokens) {
      if (t.type === 'Identifier') {
        for (var f of Model.fields) {
          if (f.name === t.value) {
            usedFields.push(f);
            var found = false;
            for (var cf of compatibleFields) {
              if (cf.id === f.id) found = true;
            }
          }
        }
      }
    }
    return usedFields;
  };

  // Get the visible lines in the table
  this.getVisibleLines = function () {
    var $tbody = $('#synner-data-table .table tbody');
    var tbodyTop = $tbody.offset().top;
    var tbodyHeight = $tbody.height();
    var lines = $tbody.find('tr');
    var res = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines.eq(i);
      line.removeClass('highlighted');
      var lineTop = line.offset().top;
      if (lineTop + line.height() > tbodyTop &&
          lineTop < tbodyTop + tbodyHeight) {
        res.push(line);
      }
    }
    return res;
  };

  this.resetHighlight = function (after) {
    var lines = $('#synner-data-table tbody').find('tr');
    for (var i = 0; i < lines.length; i++) {
      lines.eq(i).removeClass('highlighted');
    }
    if (after) after();
  };

  this.highlightTimeout = null;

  this.compileFunction = function (functionBodyText, fields) {
    try {
      var functionText = 'function domain() {}; '; // placeholder for functions that are defined in the backend
      functionText += '(function (';
      for (var i = 0; i < Model.fields.length; i++) {

        // We check that the field in the model is in the field's dependencies
        // if not we include it but with an hidden name (e.g. Height would be __Height)
        var found = false;
        for (var f of fields) {
          if (f.id === Model.fields[i].id) {
            found = true;
            break;
          }
        }
        functionText += (found ? '' : '__') + Model.fields[i].name;
        functionText += ',';
      }
      functionText += ') { var random = 42; function uniform() {}; function normal() {}; return (' + functionBodyText + '); })';
      return eval(functionText);
    } catch (e) {
      if (e.message === 'Unexpected token )') {
        throw 'Invalid or unexpected token';
      } else {
        throw e.message;
      }
    }
  };

  this.createMockArguments = function (fields) {
    var arguments = [];
    for (var f of fields) {
      if (f.type === 'integer') arguments.push(42);
      else if (f.type === 'decimal') arguments.push(42.24);
      else if (f.type === 'time') arguments.push(42);
      else if (f.type === 'date') arguments.push(42);
      else arguments.push('string_example');
    }
    return arguments;
  };

  this.evaluateConditionInLines = function (conditionFunction, $tableLine, afterFunction) {
    var conditionFunctionArguments = [];
    for (var i = 0; i < Model.fields.length; i++) {
      if (Model.fields[i].type === 'string') {
        conditionFunctionArguments.push($tableLine.find('td').eq(i).find('input').val());
      } else {
        conditionFunctionArguments.push(parseFloat($tableLine.find('td').eq(i).find('input').val()));
      }
    }
    if (conditionFunction.apply(this, conditionFunctionArguments)) {
      $tableLine.addClass('highlighted');
    } else {
      $tableLine.removeClass('highlighted');
    }
    clearTimeout(this.highlightTimeout);
    var self = this;
    this.highlightTimeout = setTimeout(function () { self.resetHighlight(afterFunction); }, 700);
  };

  this.clearFieldsHighlights = function () {
    clearTimeout(this.highlightTimeout);
    this.resetHighlight();
    this.highlightTimeout = null;
  }

}]);
