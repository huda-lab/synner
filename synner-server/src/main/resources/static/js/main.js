var Synner = angular.module('Synner', ['ngResource', 'ngAnimate', 'rzModule', 'ui.ace', 'ngSanitize', 'angular.filter']);

Synner.value('Parameters', {
  DEBUG: true,
  SERVER: {
    DEBUG: '',
    PRODUCTION: ''
  },
  GENERATION_DELAY: 400,
  COMPLETE_PREVIEW_INIIAL_GENERATION_DELAY: 2000,
  COMPLETE_PREVIEW_GENERATION_DELAY: 100,
  INFER_DELAY: 200,
  AVAILABLE_DOMAINS: null,
  ROWS_TO_PROGRESSIVELY_ADD: 10,
  MAX_INTERFACE_DATA_VOLUME: 50 // Max allowed data to be loaded in the interface
});

Synner.controller('MainCtrl', ['$rootScope', '$scope', '$timeout', '$window', '$anchorScroll', '$location', 'Model', 'API', 'Infer', 'Parameters',
  function ($rootScope, $scope, $timeout, $window, $anchorScroll, $location, Model, API, Infer, Parameters) {
    $scope._selectedField = {obj: null};

    $scope.model = Model;

    API.getInfo(function (res) {
      Parameters.AVAILABLE_DOMAINS = res['available-domains'];
    });

    $scope.addColumn = function (type) {
      var newField = Model.addNewColumn(type);
      $timeout(function () {
        $('#synner-data-table .field-name').eq(newField.id).focus().select();
        $location.hash('end-of-table-placeholder');
        $anchorScroll();
      }, 10);
      $scope.selectField(newField);
    };

    angular.element($window).bind('resize', function () {
      $rootScope.$broadcast('windowResize', $window.innerWidth);
    });

    $scope.selectField = function (field) {
      $scope._selectedField.obj = field;
      $timeout(function () {
        $scope.updateHeight();
      });
    };
    $rootScope.$on('selectField', function (e, field) { $scope.selectField(field); });

    $scope.changeDataValue = function (dataValue, field) {
      dataValue.l = dataValue.v !== undefined && dataValue.v !== null;
      if ((typeof dataValue.v) === 'string' && dataValue.v.length === 0) dataValue.l = false;
      if (!field._generator.obj) Infer.inferFromData(field);
      $scope.requestNewDataGeneration();
    };

    $scope.selectInferCategory = function (req) {
      console.log(req);
    };

    $scope.getInputPattern = function (f) {
      if (f.type === 'string') return '';
      return "/^[0-9]{1,3}(\.\d{0,3})?/";
    };

    $scope.changeFieldType = function (fieldId) {
      Model.changeFieldType(fieldId);
      $scope.requestNewDataGeneration();
    };

    $scope.removeColumn = function (fieldId) {
      if ($scope._selectedField && $scope._selectedField.obj && $scope._selectedField.obj.id === fieldId)
        $scope._selectedField.obj = undefined;
      Model.removeColumn(fieldId);
    };

    $scope.hideColumn = function (fieldId) {
      Model.hideColumn(fieldId);
    };

    $scope.updateHeight = function () {
      $scope.mainPropertiesPanelHeight = $('body').height() - $('#synner-data-table').height() - $('.navbar').height();
    };

    // On resize window, so to maintain the correct layout
    window.onresize = function (event) {
      $scope.updateHeight();
    };

    $scope.requestNewDataGeneration = function () {
      Model.requestNewDataGeneration();
    };

    Model.dataGenerationReqTimeout = null;
    $scope.$watch(function () {
      var elements = [];
      for (var f of Model.fields) {
        if (!f._generator.obj) continue;
        elements.push(f._generator.obj);
        elements.push(f.filter);
        elements.push(f.errorRows);
        elements.push(f.missingRows);
      }
      return elements;
    }, $scope.requestNewDataGeneration, true);
  }
]);

Synner.run(['$rootScope', function ($rootScope, $timeout) {
  $rootScope.$on('$includeContentLoaded', function () {
  });

  $rootScope.$on('selectedFieldChanged', function () {
  });
}]);

Synner.directive("limitCharsForFields", [function () {
  return {
    restrict: "A",
    link: function (scope, elem, attrs) {
      angular.element(elem).on("keypress", function (e) {
        if (e.key === " ") {
          $el = angular.element(elem);
          $el.val($el.val() + '_');
          e.preventDefault();
        }
      });
    }
  }
}]);

Synner.directive("limitCharsForDataFields", [function () {
  return {
    restrict: "A",
    link: function (scope, elem, attrs) {
      angular.element(elem).on("keypress", function (e) {
        if (e.key === " ") {
          $(elem).val($(elem).val() + '_');
          e.preventDefault();
        }
      });
    }
  }
}]);

Synner.directive("preventDropdownLooseFocus", [function () {
  return {
    restrict: "A",
    link: function (scope, elem, attrs) {
      angular.element(elem).on("click", function (e) {
        e.stopPropagation();
      });
    }
  }
}]);

Synner.filter('formatMd', function ($sce) {
  return function (input, query) {
    return $sce.trustAsHtml(input.replace(RegExp('\\*\\*(.*)\\*\\*', 'g'), '<strong>$1</strong>'));
  }
});

Synner.directive('onEnterPress', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if (event.which === 13) {
        scope.$apply(function () {
          scope.$eval(attrs.onEnterPress);
        });
        event.preventDefault();
      }
    });
  };
});