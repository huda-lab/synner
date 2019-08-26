angular.module('Synner')
    .directive('tableData', ['$timeout', 'Model', 'Parameters', '$anchorScroll', '$location', '$rootScope', function ($timeout, Model, Parameters, $anchorScroll, $location, $rootScope) {
      return {
        templateUrl: 'fragments/table.html',
        replace: true,
        restriction: 'E',
        scope: true,
        link: function ($scope, element, attrs) {

          $scope.addRows = function () {
            Model.addRows();
          };

          $scope.removeColumn = function (col) {
            $scope.$parent.removeColumn(col.id);
          };

          $scope.editFilter = function (f) {
            f.editingFilter = !(f.editingFilter);
          };

          $scope.editMissingError = function (f) {
            f.editingMissingError = !(f.editingMissingError);
          };

          $scope.hideColumn = function (col) {
            $scope.$parent.hideColumn(col.id);
          };

          $scope.model = Model;

          $scope.getInputTypeForField = function (f) {
            if (f.type === 'time') return 'time';
            if (f.type === 'date') return 'date';
            if (f.type === 'integer' || f.type === 'decimal') return 'number';
            return 'text'
          };

          $(window).scroll(function () {
            if ($(window).scrollTop() >= $(document).height() - $(window).height() - 10) {
                $scope.addRows();
            }
          });

          $rootScope.$on('DATA_RESET', function () {
            $location.hash('data-row-0');
            $anchorScroll();
          });

          $scope.checkDuplicates = function (f) {
            for (var i = 0; i < Model.fields.length; i++) {
              Model.fields[i].hasFieldNameError = false;
            }
            for (var i = 0; i < Model.fields.length; i++) {
              for (var j = i + 1; j < Model.fields.length; j++) {
                if (Model.fields[j].name === Model.fields[i].name) {
                  Model.fields[j].hasFieldNameError = true;
                  Model.fields[i].hasFieldNameError = true;
                }
              }
            }
          };

        }
      };
    }]);
