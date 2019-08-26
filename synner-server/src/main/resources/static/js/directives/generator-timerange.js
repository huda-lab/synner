angular.module('Synner')
    .directive('generatorTimerange', ['Model', function (Model) {
      return {
        templateUrl: 'fragments/generator-timerange.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.inputRead = false;
          $scope.possibleHours = [];
          $scope.possibleMinutes = [];
          for (var i = 0; i < 24; i++) $scope.possibleHours.push(i);
          for (var i = 0; i < 60; i++) $scope.possibleMinutes.push(i);
          $scope.selectedFromHour = 0;
          $scope.selectedFromMinute = 0;
          $scope.selectedToHour = 0;
          $scope.selectedToMinute = 0;

          $scope.formatNum = function (n) {
            var strNum = n.toString();
            if (strNum.length === 1) return '0' + n;
            return strNum;
          };

          function updateResult() {
            if (!$scope.inputRead) return;

            var fromVal = timeToInt($scope.selectedFromHour, $scope.selectedFromMinute);
            var toVal = timeToInt($scope.selectedToHour, $scope.selectedToMinute);

            $scope._result.obj = {
              'timerange': { from: fromVal, to: toVal }
            };
          }

          function readResult() {
            if ($scope.inputRead) return;
            var obj = $scope._result.obj;

            if (obj && Model.isTimeRange(obj)) {
              var from = intToTime(obj.timerange.from);
              var to = intToTime(obj.timerange.to);
              $scope.selectedFromHour = from.hours;
              $scope.selectedFromMinute = from.minutes;
              $scope.selectedToHour = to.hours;
              $scope.selectedToMinute = to.minutes;
            } else {
              $scope.selectedFromHour = 0;
              $scope.selectedFromMinute = 0;
              $scope.selectedToHour = 0;
              $scope.selectedToMinute = 0;
            }

            $scope.inputRead = true;
          }

          function intToTime(t) {
            return {
              hours: Math.floor(t / 60),
              minutes: t - Math.floor(t / 60) * 60
            };
          }

          function timeToInt(hours, minutes) {
            return hours * 60 + minutes;
          }

          $scope.$watchCollection('[selectedFromHour, selectedFromMinute, selectedToHour, selectedToMinute]', updateResult);
          $scope.$watchCollection('[_result, _result.obj, field]', function () {
            $scope.inputRead = false;
            readResult();
          });
        }
      };
    }]);

