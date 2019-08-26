angular.module('Synner')
    .directive('navbar', ['Parameters', 'API', 'Model', '$rootScope', function (Parameters, API, Model, $rootScope) {
      return {
        templateUrl: 'fragments/navbar.html',
        replace: true,
        restriction: 'E',
        scope: true,
        link: function ($scope, element, attrs) {
          $scope.model = Model;

          $scope.downloadModel = (function () {
            let a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            return function (object, fileName) {
              var blob = new Blob([JSON.stringify(object)], {type: "octet/stream"});
              var url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          $scope.saveConfig = function () {
            var config = {
              fields: JSON.parse(JSON.stringify(Model.fields)), //fields deep copy
              dataVolume: Model.dataVolume
            };
            $scope.filterNGHash(config);
            $scope.downloadModel(config, 'model-' + (new Date()).toISOString() + '.json');
          };

          $scope.filterNGHash = function (obj) {
            if ('$$hashKey' in obj) obj['$$hashKey'] = undefined;
            for (var p in obj) {
              if (typeof obj[p] === 'object') $scope.filterNGHash(obj[p]);
            }
          };

          $scope.fileInput = document.getElementById("modeluploadfileinput");
          $scope.fileInput.addEventListener("change", function () {
            if (this.files && this.files[0]) {
              var file = this.files[0];
              var reader = new FileReader();
              reader.addEventListener('load', function (e) {
                var obj = JSON.parse(e.target.result);
                Model.fields = obj.fields;
                Model.dataVolume = obj.dataVolume;
                Model.data = [];
                $scope.$apply();
                $scope.fileInput.value = '';
              });
              reader.readAsBinaryString(file);
            }
          });

          $scope.barpos = 0;
          $scope.progressBarDisplayInterval = null;
          $scope.$generationStatus = element.find('.generation-status');
          $scope.$generationStatusProgressbar = element.find('.generation-status-progressbar');
          $scope.progressBarSize = 0.2;
          $scope.pbopacity = 0;
          document.nb = $scope;
          $scope.updateMeasures = function () {
            $scope.generationStatusWidth = $scope.$generationStatus.width();
          };
          $scope.animateLoad = function () {
            if ($scope.pbopacity < 1) $scope.pbopacity += 0.2; else $scope.pbopacity = 1;
            $scope.$generationStatusProgressbar.css({
              left: $scope.generationStatusWidth / 2 +
                  ($scope.generationStatusWidth / 2) * Math.sin(($scope.barpos - 1) * Math.PI) -
                  ($scope.generationStatusWidth * $scope.progressBarSize) / 2,
              opacity: $scope.pbopacity
            });
            $scope.barpos = ($scope.barpos + 0.02) % 2;
          };
          $scope.startLoadingDisplay = function () {
            $scope.updateMeasures();
            $scope.pbopacity = 0;
            $scope.$generationStatusProgressbar.css({display:'initial', opacity: 0});
            clearInterval($scope.progressBarDisplayInterval);
            $scope.progressBarDisplayInterval = setInterval($scope.animateLoad, 25);
          };
          $scope.stopLoadingDisplay = function () {
            if ($scope.progressBarDisplayInterval == null) return;
            clearInterval($scope.progressBarDisplayInterval);
            $scope.progressBarDisplayInterval = null;
            $scope.$generationStatusProgressbar.css({display:'none', opacity: 0});
          };
          $rootScope.$on('DATA_UPDATE_START', $scope.startLoadingDisplay);
          $rootScope.$on('DATA_UPDATE_END', $scope.stopLoadingDisplay);
        }
      };
    }]);