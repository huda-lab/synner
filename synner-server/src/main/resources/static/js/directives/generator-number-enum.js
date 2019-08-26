  angular.module('Synner')
    .directive('generatorNumberEnum', ['Model', 'Parameters', function (Model, Parameters) {
      return {
        templateUrl: 'fragments/generator-number-enum.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.MAX_INFERRED_CASES = 2;
          $scope.inputRead = false;
          $scope.cases = [
              // {value: 21, freq: 42},
          ];

          function updateCdf() {
            $scope.cases[0].cdf = $scope.cases[0].prob / 100;
            for (var i = 1; i < $scope.cases.length - 1; i++) {
              $scope.cases[i].cdf = $scope.cases[i - 1].cdf + $scope.cases[i].prob / 100;
            }
          }

          function select() {
            var r = Math.random();
            var sel = -1;
            for (var j = 0; j < $scope.cases.length - 1; j++) {
              if (r < $scope.cases[j].cdf) {
                sel = j;
                break;
              }
            }
            while ($scope.cases[sel].prob === 0) {
              sel--;
              if (sel < 0) sel = $scope.cases.length - 2;
            }
            return sel;
          }

          function simGenerations() {
            updateCdf();
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              $scope.cases[i].simulations = [];
            }
            for (var si = 0; si < Model.experimentsNumber; si++) {
              var hist = [];
              for (var i = 0; i < $scope.cases.length - 1; i++) hist.push(0);
              for (var i = 0; i < Model.dataVolume; i++) {
                hist[select()]++;
              }
              for (var i = 0; i < $scope.cases.length - 1; i++) {
                var freq = hist[i] / Model.dataVolume;
                var idealFreq = $scope.cases[i].freq / $scope.freqSum;
                var el = { };
                if (freq < idealFreq) {
                  el.initPerc = freq;
                  el.width = idealFreq - freq;
                } else {
                  el.initPerc = idealFreq;
                  el.width = freq - idealFreq;
                }
                $scope.cases[i].simulations.push(el);
              }
            }
          }

          function updateResult() {
            if (!$scope.inputRead) return;

            var generator = { cases: [], ratios: [] };

            for (var el of $scope.cases) {
              if (el.value === null || el.value === undefined || el.value.length === 0) continue;
              generator.cases.push({ value: el.value });
              if ($scope.freqSum > 0) generator.ratios.push(el.freq);
            }

            $scope._result.obj = generator;
            $scope.inputRead = true;

            simGenerations();
          }

          function readResult() {
            if ($scope.inputRead) return;

            $scope.cases.length = 0; // clean array
            var obj = $scope._result.obj;

            if (!obj || !Model.isCases(obj)) {

              // InferAPI the generator from the data
              var samples = new Set(Model.getSamples($scope.field));
              for (var sample of samples.values()) {
                $scope.cases.push({value: sample, freq: 1});
                if ($scope.cases.length >= $scope.MAX_INFERRED_CASES) break;
              }

              if ($scope.cases.length === 0) {
                $scope.cases.push({value: 0, freq: 1});
                $scope.cases.push({value: 1, freq: 1});
              }

            } else {

              // Read configuration from the generator
              if (Model.isCases(obj)) {
                for (var i = 0; i < obj.cases.length; i++) { // prob and values have the same length
                  $scope.cases.push({
                    value: obj.cases[i].value,
                    freq: obj.ratios[i] ? obj.ratios[i] : 0
                  });
                }
              } else {
                $scope.cases.push({
                  value: obj.value,
                  freq: 1
                });
              }

            }

            $scope.cases.push({value: null, freq: 1});
            $scope.inputRead = true;
          }

          // Update the frequencies sum to calculate the probabilities
          function updateFreqSum () {
            $scope.freqSum = 0;
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if ($scope.cases[i].value === null) continue;
              $scope.freqSum += $scope.cases[i].freq;
            }
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if ($scope.cases[i].value === null ||
                  $scope.cases[i].value === undefined ||
                  $scope.cases[i].value.length === 0) continue;
              $scope.cases[i].prob = $scope.cases[i].freq / $scope.freqSum;
            }
          }

          $scope.increaseFreq = function (scase) {
            scase.freq++;
          };

          $scope.decreaseFreq = function (scase) {
            scase.freq--;
          };

          $scope.$watchCollection(function () {
            var vals = [];
            for (var i = 0; i < $scope.cases.length - 1; i++) vals.push($scope.cases[i].freq);
            return vals;
          }, function () {
            $scope.freqSum = 0;
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if ($scope.cases[i].value.length === 0) continue;
              $scope.freqSum += $scope.cases[i].freq;
            }
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if ($scope.cases[i].value.length === 0) continue;
              $scope.cases[i].prob = Math.round(($scope.cases[i].freq / $scope.freqSum) * 100);
            }
            updateResult();
          });

          $scope.$watchCollection(function () {
            var vals = [];
            for (var i = 0; i < $scope.cases.length - 1; i++) vals.push($scope.cases[i].value);
            return vals;
          }, function () {
            if (!$scope.inputRead) return;

            // Check if there are void elements to delete
            for (var i = 0; i < $scope.cases.length - 1; i++) {
              if (!$scope.cases[i].value) $scope.cases.splice(i, 1);
            }

            // Check if the last element is full (so we can add a new empty element)
            if ($scope.cases.length === 0 || $scope.cases[$scope.cases.length - 1].value.length > 0) {
              $scope.cases.push({value: '', freq: 1, isRegExp: false});
            }

            updateResult();
          });

          $scope.$watchCollection(function () {
            var vals = [];
            for (var i = 0; i < $scope.cases.length - 1; i++) vals.push($scope.cases[i].isRegExp);
            return vals;
          }, updateResult);

          $scope.$watch('cases', function () {
              if (!$scope.inputRead) return;

              // Check if there are void elements to delete
              for (var i = 0; i < $scope.cases.length - 1; i++) {
                if ($scope.cases[i].value === null) $scope.cases.splice(i, 1);
              }

              // Check if the last element is full (so we can add a new empty element)
              if ($scope.cases.length === 0 || $scope.cases[$scope.cases.length - 1].value !== null) {
                $scope.cases.push({value: null, freq: 1});
              }

              updateFreqSum();
              updateResult();
          }, true);
          $scope.$watch('_result', function () {
            $scope.inputRead = false;
            $scope.cases = [];
            readResult();
          });
        }
      };
    }]);

