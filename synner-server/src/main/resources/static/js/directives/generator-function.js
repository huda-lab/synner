angular.module('Synner')
    .directive('generatorFunction', ['Model', 'Functions', '$rootScope', 'Parameters', function (Model, Functions, $rootScope, Parameters) {
      return {
        templateUrl: 'fragments/generator-function.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.inputRead = false;
          $scope.cases = [
            // {expression: '42', freq: 42},
          ];
          $scope.usedFieldsNotInDependencies = [];
          $scope.expressionError = null;

          function insertAtCursor(field, val) {
            if (field.selectionStart || field.selectionStart === '0') {
              field.value = field.value.substring(0, field.selectionStart) + val + field.value.substring(field.selectionEnd, field.value.length);
            } else {
              field.value += val;
            }
            $scope.selectedCase.expression = field.value;
          }

          $scope.selectInput = function (ecase, e) {
            $scope.selectedCase = ecase;
            $scope.selectedInput = e.target;
          };

          $scope.add = function (exp) {
            insertAtCursor($scope.selectedInput, exp);
          };

          $scope.increaseFreq = function (scase) {
            scase.freq++;
          };

          $scope.decreaseFreq = function (scase) {
            scase.freq--;
          };

          function functionExpressionUpdated() {
            $scope.usedFields = [];
            $scope.usedFieldsNotInDependencies = [];

            for (var idx = 0; idx < $scope.cases.length; idx++) {
              if ($scope.cases[idx].expression === null || $scope.cases[idx].expression.length === 0) continue;

              var expression = $scope.cases[idx].expression;

              try {
                var functionAvailableFields = [];
                for (var i = 0; i < Model.fields.length; i++) {

                  // We check that the field in the model is in the field's dependencies
                  var found = false;
                  for (var dep of $scope.field.dependencies) {
                    if (dep.id === Model.fields[i].id) {
                      found = true;
                      break;
                    }
                  }

                  functionAvailableFields.push(Model.fields[i]);
                }
                var compiledFunction = Functions.compileFunction(expression, functionAvailableFields); // just so we check syntax errors
                compiledFunction.apply(null, Functions.createMockArguments(functionAvailableFields));
                var usedFields = Functions.extractUsedFields(expression, $scope.field);
                var usedFieldsNotInDependencies = [];
                for (var usedField of usedFields) {
                  var found = false;
                  for (var field of $scope.field.dependencies) {
                    if (field.id === usedField.id) {
                      found = true;
                      break;
                    }
                  }
                  if (!found) usedFieldsNotInDependencies.push(usedField);
                }

                for (var uf of usedFields) {
                  var found = false;
                  for (var suf of $scope.usedFields) {
                    if (suf.id === uf.id) {
                      found = true;
                      break;
                    }
                  }
                  if (!found) $scope.usedFields.push(uf);
                }

                for (var uf of usedFieldsNotInDependencies) {
                  var found = false;
                  for (var suf of $scope.usedFieldsNotInDependencies) {
                    if (suf.id === uf.id) {
                      found = true;
                      break;
                    }
                  }
                  if (!found) $scope.usedFieldsNotInDependencies.push(uf);
                }

                if ($scope.usedFieldsNotInDependencies.length === 0) {
                  updateResult();
                } else {
                  throw "ReferenceError: " + $scope.usedFieldsNotInDependencies[0].name + " is not defined";
                }

                $scope.expressionError = null;
              } catch (e) {
                $scope.expressionError = e;
              }

            }
          }

          // Update the frequencies sum to calculate the probabilities
          function updateFreqSum () {
            $scope.freqSum = 0;
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if ($scope.cases[i].expression === null) continue;
              $scope.freqSum += $scope.cases[i].freq;
            }
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if ($scope.cases[i].expression === null ||
                  $scope.cases[i].expression === undefined ||
                  $scope.cases[i].expression.length === 0) continue;
              $scope.cases[i].prob = $scope.cases[i].freq / $scope.freqSum;
            }
          }

          function updateResult() {
            if (!$scope.inputRead) return;

            var generator = { 'function': [] };
            var genCases = generator.function;

            for (var el of $scope.cases) {
              if (el.expression === null || el.expression === undefined || el.expression.length === 0) continue;
              genCases.push({
                expression: el.expression,
                freq: el.freq
              });
            }

            $scope._result.obj = generator;
            $scope.inputRead = true;
          }

          function readResult() {
            if ($scope.inputRead) return;
            var obj = $scope._result.obj;

            if (obj && Model.isFunction(obj)) {
              for (var idx = 0; idx < obj.function.length; idx++) {
                $scope.cases[idx] = {
                  expression: obj.function[idx].expression,
                  freq: obj.function[idx].freq
                };
              }
            } else {
              $scope.cases[0] = {
                expression: $scope.field.type === 'string' ? "'A'" : '0',
                freq: 1
              };
            }

            $scope.inputRead = true;
          }

          $scope.$watch('cases', function () {
            if (!$scope.inputRead) return;

            // Check if there are void elements to delete
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if (($scope.cases[i].expression === null ||
                  $scope.cases[i].expression.length === 0) && $scope.cases.length > 2) $scope.cases.splice(i, 1);
            }

            // Check if the last element is full (so we can add a new empty element)
            if ($scope.cases.length === 0 || $scope.cases[$scope.cases.length - 1].expression !== null) {
              $scope.cases.push({expression: null, freq: 1});
            }

            updateFreqSum();
            functionExpressionUpdated();
          }, true);
          $scope.$watchCollection('field.dependencies', function () {
            functionExpressionUpdated();
          });
          $scope.$watch('_result', function () {
            $scope.inputRead = false;
            $scope.cases = [];
            readResult();
          });
        }
      };
    }]);