angular.module('Synner')
    .directive('inferPanel', ['Parameters', 'Infer', 'Model', function (Parameters, Infer, Model) {
        return {
            templateUrl: 'fragments/infer-panel.html',
            replace: true,
            restriction: 'E',
            scope: {
                field: '='
            },
            link: function ($scope, element, attrs) {
                $scope.model = Model;

                $scope.modify = function (f, generator) {
                    $scope.field._generator.obj = generator;
                    Model.deleteFieldData($scope.field);
                };

                $scope.$watchGroup(['field', 'field.type', 'field.name'], function () {
                    Infer.inferFromData($scope.field);
                });

            }
        };
    }]);