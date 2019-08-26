angular.module('Synner')
    .directive('generatorSwitch', ['Model', 'Functions', 'Parameters', '$timeout', function (Model, Functions, Parameters, $timeout) {
      return {
        templateUrl: 'fragments/generator-switch.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result',
          field: '=',
        },
        link: {
          pre: function preLink($scope, element, attrs) {
            var onChangeFirstTime = {}; // by editor id it says if it's the first time the on change is called

            $scope.aceEditorOnChange = function (e) {
              clearTimeout($scope.errorTimeout);

              var _session = e[1].session;
              if (onChangeFirstTime[e[1].id] === undefined) {
                onChangeFirstTime[e[1].id] = true;
                return;
              }
              var conditionalExpression = _session.getValue();
              $scope.addSuggestions(_session.getValue());
              if (conditionalExpression.length === 0) return;
              var $visibleLines = Functions.getVisibleLines();
              var conditionFunction;
              var error = null;
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
                conditionFunction = Functions.compileFunction(conditionalExpression, functionAvailableFields);

                Model.haltGeneration = true;
                for (var i = 0; i < $visibleLines.length; i++) {
                  Functions.evaluateConditionInLines(conditionFunction, $visibleLines[i], function () {
                    Model.haltGeneration = false;
                    Model.requestNewDataGeneration();
                  });
                }
              } catch (e) {
                error = e;
              }

              if (error == null) {
                var c = $scope.getCaseByEditorElement(e[1].container);
                if (c) c.error = null;
              } else {
                $scope.errorTimeout = setTimeout(function () {
                  var c = $scope.getCaseByEditorElement(e[1].container);
                  if (c) c.error = error;
                  $scope.$apply();
                }, 1000);
              }
            };

            $scope.getCaseByEditorElement = function (editorContainer) {
              var idx = parseInt(editorContainer.id.replace('cases-condition-', ''));
              if (idx === '') return null; // For the new case expression
              return $scope.cases[idx];
            };

            $scope.aceEditorLoaded = function (_editor) {
              var _session = _editor.getSession();
              _editor.setOptions({
                maxLines: 1, // make it 1 line
                autoScrollEditorIntoView: true,
                highlightActiveLine: false,
                printMargin: false,
                showGutter: false,
                fontSize: 12,
                mode: "ace/mode/javascript",
                theme: "ace/theme/crimson_editor"
              });
              _editor.container.style.lineHeight = 1.8;
              _editor.renderer.updateFontSize();
              _session.setUndoManager(new ace.UndoManager());
              _editor.commands.bindKey("Enter|Shift-Enter", "null");
              _editor.focus();
            };

            $scope.addSuggestions = function (expression) {
              $scope.expressionSuggestions = [];
              if (expression.length === 0) {
                for (var f of $scope.field.dependencies) $scope.expressionSuggestions.push(f.name);
              } else if (expression.match(/^[A-Za-z0-9\\_\s]+$/)) {
                $scope.expressionSuggestions.push('==');
                $scope.expressionSuggestions.push('!=');
                $scope.expressionSuggestions.push('>');
                $scope.expressionSuggestions.push('<');
                $scope.expressionSuggestions.push('>=');
                $scope.expressionSuggestions.push('<=');
              }

              if ($scope.expressionSuggestions.length > 0) {
                $scope.dropdownAutosuggestions.css({opacity: 1});
                return true;
              } else {
                $scope.removeSuggestions();
                return false;
              }
            };

            $scope.removeSuggestions = function () {
              $scope.dropdownAutosuggestions.css({opacity: 0});
              $scope.expressionSuggestions = null;
            };

            $scope.aceEditorOnFocus = function (e) {
              var _session = e[0].session;
              var suggestionsAdded = $scope.addSuggestions(_session.getValue());
              $timeout(function () {
                $scope.currentFocusedEditor = e;
                document.currentFocusedEditor = e;
                var $focusedEditor = $($scope.currentFocusedEditor[0].container);
                var focEditorOffset = $focusedEditor.offset();
                if (suggestionsAdded) {
                  $scope.dropdownAutosuggestions.css({opacity: 1}).offset({
                    top: focEditorOffset.top + $focusedEditor.height(),
                    left: focEditorOffset.left
                  });
                }
              });
            };

            $scope.aceEditorOnBlur = function () {
              $scope.dropdownAutosuggestions.css({opacity: 0});
            };

            $scope.addSuggestionToCurrentEditor = function (val) {
              if (!$scope.currentFocusedEditor) return;
              var currVal = $scope.currentFocusedEditor[0].env.editor.getValue();
              $scope.currentFocusedEditor[0].env.editor.setValue(currVal + val, 1);
              $scope.currentFocusedEditor[0].env.editor.focus();
              $scope.dropdownAutosuggestions.css({opacity: 0});
            };

          },
          post: function postLink($scope, element, attrs) {
            $scope.dropdownAutosuggestions = element.find('.dropdown-autosuggestions');
            $scope.cases = [
              // {condition: 'Height > 10', error: null, _generator: {obj: {distribution: "uniform", min: -1, max: 1}}}
            ];
            $scope._defaultCase = {obj: undefined};
            $scope.compactViewDefaultCase = false;
            $scope.expressionSuggestions = null;

            document.switchScope = $scope;

            function updateResult() {
              if (!$scope.inputRead) return; // Prevent changes on the distribution parameters to change the input, even before reading it
              if (!$scope._result) return; // in case the directive is active without any result specified

              var generator = {'switch': []};

              for (var c of $scope.cases) {
                generator['switch'].push({
                  'pos': c.id,
                  'case': c.condition,
                  'then': c._generator.obj
                });
              }
              generator['switch'].push({
                'default': $scope._defaultCase.obj
              });

              $scope._result.obj = generator;
              $scope.inputRead = true;
            }

            function readResult() {
              if ($scope.inputRead) return;

              var obj = $scope._result.obj;
              if (obj) {
                $scope.cases = [];
                if (Model.isSwitch(obj)) {
                  for (var c of obj['switch']) {
                    if ('default' in c) {
                      $scope._defaultCase.obj = c['default'];
                    } else {
                      $scope.cases.push({
                        id: c['pos'],
                        condition: c['case'],
                        error: null,
                        _generator: {obj: c['then']}
                      });
                    }
                  }
                } else {
                  $scope._defaultCase.obj = obj;
                }
              }
              $scope.inputRead = true;
            }

            $scope.addNewCondition = function () {
              $scope.cases.unshift({
                id: $scope.cases.length,
                condition: '',
                erros: null,
                _generator: {obj: undefined}
              });
            };

            $scope.deleteCase = function (c) {
              $scope.cases.splice(c.id, 1);
              for (var i = 0; i < $scope.cases.length; i++) $scope.cases[i].id = i;
            };

            $scope.$watch('field', function () {
              $scope.inputRead = false;
              readResult();
            });

            $scope.$watch('_defaultCase', function (defCase) {
              updateResult()
            }, true);

            $scope.$watch(function () {
              var cases = [];
              for (var c of $scope.cases) {
                if (!c.error) cases.push(c);
              }
              return cases;
            }, function (defCase) {
              updateResult()
            }, true);

          }
        }
      };
    }]);
