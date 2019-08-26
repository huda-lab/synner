angular.module('Synner')
    .directive('fieldErrorMissings', ['$rootScope', '$timeout', 'Model', 'Functions', 'Parameters', function ($rootScope, $timeout, Model, Functions, Parameters) {
      return {
        templateUrl: 'fragments/field-error-missings.html',
        replace: true,
        restriction: 'E',
        scope: {
          field: '='
        },
        link: function ($scope, element, attrs) {

          function updateResult() {
            if (!$scope.inputRead) return;
            $scope.field.missingRows = $scope.fieldMissings;
            $scope.field.errorRows = $scope.fieldErrors;
            $scope.field.editingMissingError = false;
            $scope.inputRead = true;
          }

          function readResult() {
            if ($scope.inputRead) return;
            $scope.missingRows = $scope.field.missingRows === undefined ? 0 : $scope.field.missingRows;
            $scope.errorRows = $scope.field.errorRows === undefined ? 0 : $scope.field.errorRows;
            $scope.inputRead = true;
          }

          $scope.approveChanges = function () {
            updateResult();
          };

          $scope.discargeChanges = function () {
            Functions.clearFieldsHighlights();
            $scope.fieldMissings = $scope.field.missingRows || 0;
            $scope.fieldErrors = $scope.field.errorRows || 0;
            $scope.field.editingMissingError = false;
            $scope.inputRead = true;
          };

          $scope.missingNumberChange = function () {
            console.log('missing number change', $scope.missingRows);
          };

          $scope.$watch('field.editingMissingError', function (editingMissingError) {
            if (editingMissingError) {
              $timeout(function () {
                element.find('input.field-errors-number').focus();
              });
            } else {
              $scope.discargeChanges();
              $scope.$parent.selectField($scope.field);
            }
          });
          $scope.$watchGroup(['fieldMissings', 'fieldErrors'], function () {

          });
          $scope.$watchGroup(['field.fieldErrors', 'field.fieldMissings'], function () {
            $scope.inputRead = false;
            readResult();
          });

        }
      };
    }]);
