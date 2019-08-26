angular.module('Synner')
    .directive('generator', ['Model', 'Parameters', function (Model, Parameters) {
      return {
        templateUrl: 'fragments/generator.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result',
          field: '=',
          compactView: '='
        },
        link: function ($scope, element, attrs) {
          $scope.inputRead = false;
          $scope.modality = null;
          $scope.modalities = [];

          function readResult() {
            var obj = $scope._result.obj;
            if (obj) {
              if (Model.isFunction(obj)) {
                $scope.modality = 'function';
              } else if (Model.isCases(obj)) {
                $scope.modality = 'enumeration';
              } else if (Model.isDomain(obj)) {
                $scope.modality = 'domain';
              } else if (Model.isDistribution(obj)) {
                $scope.modality = 'distribution';
              } else if (Model.isTimeRange(obj)) {
                $scope.modality = 'timerange';
              } else if (Model.isDateRange(obj)) {
                $scope.modality = 'daterange';
              } else if (Model.isVisualRelationship(obj) &&
                         Model.filterNumericFields($scope.field.dependencies).length > 0) {
                $scope.modality = 'visrel';
              }

            }
            $scope.inputRead = true;
          }

          $scope.changeMod = function (m) {
            $scope.modality = m;
          };

          $scope.getModalityDescription = function (mv) {
            for (var m of $scope.modalities) {
              if (m.v === mv) return m.descr;
            }
            return null;
          };

          $scope.$watch('field', function() {
            $scope.modalities = Model.getFieldModalities($scope.field);
            $scope.modality = Model.getFieldGeneratorModality($scope.field);
            $scope.inputRead = false;
          });

          $scope.$watchCollection('field.dependencies', function () {
            $scope.modalities = Model.getFieldModalities($scope.field);
          });

          $scope.$watch('_result', function (res) {
            readResult();
          }, true);
          $scope.$watch('field', function () {
            readResult();
          });

        }
      };
    }]);
