angular.module('Synner')
    .directive('generatorDaterange', ['Model', function (Model) {
      return {
        templateUrl: 'fragments/generator-daterange.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.inputRead = false;
          document.datetimecontroller = $scope;

          function updateResult() {
            if (!$scope.inputRead) return;

            var from = dateToDays($scope.selectedFromDate);
            var to = dateToDays($scope.selectedToDate);

            $scope._result.obj = {
              'daterange': {
                from: from,
                to: to
              }
            };
          }

          function readResult() {
            if ($scope.inputRead) return;
            var obj = $scope._result.obj;

            if (obj && Model.isDateRange(obj)) {
              if (!$scope.selectedFromDate || obj.daterange.from !== dateToDays($scope.selectedFromDate))
                $scope.selectedFromDate = new Date(daysToMills(obj.daterange.from));
              if (!$scope.selectedToDate || obj.daterange.to !== dateToDays($scope.selectedToDate))
                $scope.selectedToDate = new Date(daysToMills(obj.daterange.to));
            } else {
              $scope.selectedFromDate = new Date(Date.now() - 365*24*60*60*1000);
              $scope.selectedToDate = new Date();
            }

            $scope.inputRead = true;
          }

          function dateToDays(date) {
            if (!date) return 0;
            return date.getTime() / (1000*60*60*24);
          }

          function daysToMills(days) {
            if (!days) return 0;
            return days * (1000*60*60*24);
          }

          $scope.$watchCollection('[selectedFromDate, selectedToDate]', updateResult);
          $scope.$watchCollection('[_result, _result.obj, field]', function () {
            $scope.inputRead = false;
            readResult();
          });
        }
      };
    }]);

