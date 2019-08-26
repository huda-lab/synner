angular.module('Synner')
    .directive('generatorDistributionMain', ['$rootScope', '$timeout', 'Model', 'Parameters', function ($rootScope, $timeout, Model, Parameters) {
      return {
        templateUrl: 'fragments/generator-distribution-main.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          field: '=',
          compactView: '='
        },
        controller: function ($scope) {
          $scope.AVAILABLE_DISTRIBUTIONS = [
            {id: 'uniform', desc: 'Uniform'},
            {id: 'gaussian', desc: 'Gaussian'},
            {id: 'gamma', desc: 'Gamma'},
            {id: 'exponential', desc: 'Exponential'},
            {id: 'custom', desc: 'Custom'}
          ];
          $scope.inputRead = false;
          $scope.distributionId = null;
          $scope.labels = {
            x: $scope.field.name,
            y: 'Frequency'
          };

          function readResult() {

            // Prevent reading if there is no need
            if ($scope.inputRead) return;

            var obj = $scope._result.obj;

            if (!obj || !Model.isDistribution(obj)) {
              $scope.distributionId = $scope.AVAILABLE_DISTRIBUTIONS[1].id; //gaussian as default
            } else {
              for (var d of $scope.AVAILABLE_DISTRIBUTIONS) {
                if (obj.distribution === d.id) {
                  $scope.distributionId = d.id;
                  break;
                }
              }
            }

            $scope.inputRead = true;
          }

          function updateResult() {
            if (!$scope.inputRead) return; // Prevent changes on the distribution parameters to change the input, even before reading it
            if (!$scope._result) return; // in case the directive is active without any result specified
            if ($scope.distributionId !== $scope._result.obj.distribution) {
              $scope._result.obj = {
                distribution: $scope.distributionId
              };
            }
          }

          $scope.changeDistributionId = function (distributionId) {
            $scope.distributionId = distributionId;
          };

          $scope.$watch('distributionId', updateResult, true);
          $scope.$watch('_result', function () {
            $scope.inputRead = false;
            readResult();
          }, true);
        }
      };
    }]);

