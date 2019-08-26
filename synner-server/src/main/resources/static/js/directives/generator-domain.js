angular.module('Synner')
    .directive('generatorDomain', ['Model', 'Parameters', 'filterFilter', '$anchorScroll', '$location', '$timeout', function (Model, Parameters, filterFilter, $anchorScroll, $location, $timeout) {
      return {
        templateUrl: 'fragments/generator-domain.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          compactView: '=',
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.AVAILABLE_DOMAINS = Parameters.AVAILABLE_DOMAINS;
          $scope.AVAILABLE_DOMAINS_AS_LIST = [];
          for (var d in $scope.AVAILABLE_DOMAINS) {
            $scope.AVAILABLE_DOMAINS_AS_LIST.push($scope.AVAILABLE_DOMAINS[d]);
          }

          $scope.AVAILABLE_DOMAINS_AS_TREE = {};
          for (var d in $scope.AVAILABLE_DOMAINS) {
            if (!$scope.AVAILABLE_DOMAINS_AS_TREE[d.category]) {
              $scope.AVAILABLE_DOMAINS_AS_TREE[d.category] = [$scope.AVAILABLE_DOMAINS[d]];
            } else {
              $scope.AVAILABLE_DOMAINS_AS_TREE[d.category].push($scope.AVAILABLE_DOMAINS[d])
            }
          }

          $scope.filteredAvailableDomain = [];
          $scope.inputRead = false;
          $scope.selectedDomain = null;
          $scope.domainsListFiter = '';
          $scope.selectedDependency = undefined;

          function getReachableDomain(rootDomain, domain, rdomains, depth) {
            if (rdomains === undefined) rdomains = {};
            if (domain === undefined) domain = rootDomain;
            if (depth === undefined) depth = 0;
            depth += 1;
            for (var sd of $scope.AVAILABLE_DOMAINS[domain].subdomains) {
              if (rdomains[sd] === undefined && sd !== rootDomain) {
                rdomains[sd] = depth;
                getReachableDomain(rootDomain, sd, rdomains, depth);
              }
            }
            return rdomains;
          }

          element.find('.domains-list-search input').bind("keydown keypress", function (event) {
            if (event.which !== 13) return;
            $scope.filteredAvailableDomain = filterFilter($scope.AVAILABLE_DOMAINS_AS_LIST, {readableName: $scope.domainsListFiter});
            $scope.changeDomain($scope.filteredAvailableDomain[0].name);
            $scope.domainsListFiter = '';
            $scope.$apply();
            event.preventDefault();
          });

          $timeout(function () {
            element.find('.domains-list-search input').focus();
          });

          function updateResult() {
            if (!$scope.inputRead) return;

            var generator = {
              'domain': {
                name: $scope.selectedDomain.name
              }
            };

            if ($scope.field.dependencies.length > 0) {
              if (!$scope.selectedDependency) {
                for (var dep of $scope.field.dependencies) {
                  var depGen = Model.getGeneratorWithoutSwitch(dep);
                  if (!Model.isDomain(depGen)) continue;
                  var rdomains = getReachableDomain($scope.selectedDomain.name);
                  for (var subDom in rdomains) {
                    if (depGen.domain.name === subDom && (generator.join === undefined ||
                        rdomains[generator.join] > rdomains[subDom])) {
                      $scope.selectedDependency = dep;
                    }
                  }
                }

                if (generator.join === undefined) { // if no dependencies are domains we just assign the first text column
                  for (var dep of $scope.field.dependencies) {
                    if (dep.type === 'string') {
                      $scope.selectedDependency = dep;
                    }
                  }
                }
              }

              generator.join = $scope.selectedDependency.name;
            }

            $scope._result.obj = generator;
          }

          function readResult() {
            if ($scope.inputRead) return;
            var obj = $scope._result.obj;

            $scope.selectedDomain = null;
            if (obj && Model.isDomain(obj)) {
              for (var dname in $scope.AVAILABLE_DOMAINS) {
                if (dname === obj.domain.name) {
                  $scope.selectedDomain = $scope.AVAILABLE_DOMAINS[dname];
                }
              }
              $scope.selectedDependency = undefined;
              for (var dep of $scope.field.dependencies) {
                if (dep.name === obj.join) $scope.selectedDependency = dep;
              }

            }

            $scope.inputRead = true;

            $timeout(function () {
              $location.hash('domain-' + $scope.selectedDomain.name);
              $anchorScroll();

              element.find('.domains-list-search input').focus();
            });
          }

          $scope.getReadableName = function (domainName) {
            return $scope.AVAILABLE_DOMAINS[domainName].readableName;
          };
          $scope.changeDomain = function (domain) {
            if (!$scope.AVAILABLE_DOMAINS[domain].available) return;
            $scope.selectedDomain = $scope.AVAILABLE_DOMAINS[domain];
          };

          // We need to update the result when dependency changes, but this is also called if the field is changed
          // (from domain to another domain) and this could be called before the _result change callback
          $scope.$watch('field.dependencies', function (newVal, oldVal) {
            $scope.inputRead = false;
            readResult();
            updateResult();
          }, true);
          $scope.$watch('selectedDomain', function (newVal, oldVal) {
            updateResult();
          }, true);
          $scope.$watch('selectedDependency', function (newVal, oldVal) {
            updateResult();
          }, true);
          $scope.$watch('_result', function (newRes, oldRes) {
            $scope.inputRead = false;
            readResult();
          }, true);
        }
      };
    }]);

