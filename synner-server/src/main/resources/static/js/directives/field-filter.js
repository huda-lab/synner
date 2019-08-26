angular.module('Synner')
    .directive('fieldFilter', ['$rootScope', '$timeout', 'Model', 'Functions', 'Parameters', function ($rootScope, $timeout, Model, Functions, Parameters) {
      return {
        templateUrl: 'fragments/field-filter.html',
        replace: true,
        restriction: 'E',
        scope: {
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.fieldFilter = '';
          $scope.filterError = null;

          function checkFilter() {
            if ($scope.fieldFilter === null || $scope.fieldFilter === undefined || $scope.fieldFilter.length === 0) {
              Functions.clearFieldsHighlights();
              $scope.filterError = null;
              return;
            }
            var $visibleLines = Functions.getVisibleLines();
            $scope.filterError = null;
            var conditionFunction;
            try {
              conditionFunction = Functions.compileFunction($scope.fieldFilter, [$scope.field]);
              for (var i = 0; i < $visibleLines.length; i++) {
                if ($visibleLines[i].hasClass('add-rows-button-row')) continue;
                Functions.evaluateConditionInLines(conditionFunction, $visibleLines[i]);
              }
            } catch (e) {
              $scope.filterError = e;
            }
          }

          function updateResult() {
            if (!$scope.inputRead) return;

            if ($scope.filterError == null) {
              Functions.clearFieldsHighlights();
              $scope.field.filter = $scope.fieldFilter;
              $scope.field.editingFilter = false;
              $scope.inputRead = true;
            }
          }

          function readResult() {
            if ($scope.inputRead) return;
            $scope.fieldFilter = $scope.field.filter;
            $scope.inputRead = true;
          }

          $scope.approveChanges = function () {
            checkFilter();
            updateResult()
          };

          $scope.discargeChanges = function () {
            Functions.clearFieldsHighlights();
            $scope.fieldFilter = $scope.field.filter;
            $scope.filterError = null;
            $scope.field.editingFilter = false;
            $scope.inputRead = true;
          };

          $scope.$watch('field.editingFilter', function (editingFilter) {
            if (editingFilter) {
              $timeout(function () {
                element.find('input.field-filter-text').focus();
              });
            } else {
              $scope.discargeChanges();
              $scope.$parent.selectField($scope.field);
            }
          });
          $scope.$watch('fieldFilter', checkFilter);
          $scope.$watch('field.filter', function () {
            $scope.inputRead = false;
            readResult();
          });

        }
      };
    }]);
