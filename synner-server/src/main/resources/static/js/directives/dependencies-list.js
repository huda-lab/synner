// D3 initialization to display graph is inspired to https://bl.ocks.org/rkirsling/5001347
angular.module('Synner')
.directive('dependenciesList', ['Parameters', 'Infer', 'Model', function (Parameters, Infer, Model) {
  return {
    restriction: 'E',
    replace: true,
    templateUrl: 'fragments/dependencies-list.html',
    scope: {
      field: '='
    }, // in this way a change on the selected link and node can reflect up to the root
    link: function ($scope, element, attrs) {
      $scope.model = Model;
      $scope.newDependency = null;
      $scope._selectedField = $scope.$parent._selectedField;
      $scope.compatibleFields = [];
      $scope.possibleDependencies = [];

      function update() {
        updateCompatibleFields();
      }

      // It adds a new dependency
      function addDependency() {
        if (!$scope.newDependency) return;
        if ($scope.newDependency.id.startsWith('field')) {
          Model.addDependency($scope.field.id, $scope.newDependency.item.id);
          Infer.inferLinkGenerator($scope.field);
          $scope.$parent.selectField($scope.field);
        } else {
          var newField = Model.addNewColumn('string');
          newField.name = $scope.newDependency.name;
          newField._generator.obj = $scope.newDependency.item;
          $scope.field.dependencies.push(newField);
          var gen = Model.getGeneratorWithoutSwitch($scope.field);
          gen.join = newField.name;
        }
        $scope.newDependency = null;
      }

      function updateCompatibleFields() {
        var compatibleFields = Model.getCompatibleFields($scope.field);
        var possibleDependencies = [];
        for (var cf of compatibleFields) {
          possibleDependencies.push({
            id: 'field@' + cf.name,
            name: cf.name,
            item: cf,
            group: 'Other columns'
          });
        }
        if ($scope.field.dependencies.length === 0) {
          var subDomains = Infer.getFieldSubdomains($scope.field);
          for (var sd of subDomains) {
            var nameSuffix = '';
            if (checkNameExisting(sd.domain.readableName)) {
              var i = 1;
              while (checkNameExisting(sd.domain.readableName + i)) i++;
              nameSuffix += i;
            }

            possibleDependencies.push({
              id: 'new@' + sd.id,
              name: sd.domain.readableName + nameSuffix,
              item: {domain: {name: sd.domain.name}},
              group: 'New field'
            });
          }
        }
        $scope.possibleDependencies = possibleDependencies;
      }

      function checkNameExisting(name) {
        for (var f of Model.fields) {
          if (name === f.name) {
            return true;
          }
        }
        return false;
      }

      $scope.deleteDependency = function (dependency) {
        Model.removeDependencyFromField($scope.field.id, dependency.id);
        $scope.$parent.selectField($scope.field);
      };

      $scope.$watch('_selectedField', update, true);
      $scope.$watch('newDependency', addDependency, true);
      $scope.$watch(function () {
        var elements = [];
        for (var f of Model.fields) {
          elements.push(f._generator.obj);
        }
        return elements;
      }, $scope.update, true);
    }
  };
}]);
