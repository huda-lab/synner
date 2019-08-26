angular.module('Synner')
    .directive('downloadForm', ['Parameters', 'API', 'Model', '$rootScope', function (Parameters, API, Model, $rootScope) {
      return {
        templateUrl: 'fragments/download-form.html',
        replace: true,
        restriction: 'E',
        scope: true,
        link: function ($scope, element, attrs) {
          $scope.model = Model;
          $scope.dwFormMessage = '';
          $scope.dwFormMessageColor = "#000000";
          $scope.dwFormFirstName = '';
          $scope.dwFormLastName = '';
          $scope.dwFormEmail = '';
          $scope.dwFormOrganization = '';
          $scope.dwFormNotes = '';


          $scope.processJSON = function (data) {
            let processed = [];
            for (let row of data) {
              let entry = {};
              for (let i = 0; i < row.length; i++) {
                if ($scope.model.fields[i].hidden) continue;
                let key = $scope.model.fields[i].name;
                entry[key] = row[i].v;
              }
              processed.push(entry);
            }
            return processed;
          };

          $scope.processCSV = function (data) {
            let processed = [];
            let header = [];
            for (let i = 0; i < data[0].length; i++) {
              if ($scope.model.fields[i].hidden) continue;
              header.push($scope.model.fields[i].name);
            }
            processed.push(header);

            for (let row of data) {
              let entry = [];
              for (let i = 0; i < row.length; i++) {
                if ($scope.model.fields[i].hidden) continue;
                entry.push(row[i].v);
              }
              processed.push(entry);
            }
            return processed;
          };

          $scope.saveData = (function () {
            let a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            return function (data, fileName, type) {
              let blob, url;

              if (type === "json") {
                let json = JSON.stringify(data);
                blob = new Blob([json], {type: "octet/stream"});
                url = window.URL.createObjectURL(blob);
              } else {
                let csvContent = "data:text/csv;charset=utf-8,";
                let csvData = "";
                data.forEach(function (rowArray) {
                  let row = rowArray.join(",");
                  csvData += row + "\r\n";
                });
                blob = new Blob([csvData], {type: csvContent});
                url = window.URL.createObjectURL(blob);
              }

              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          function validateEmail(email) {
            var re = /\S+@\S+\.\S+/;
            return re.test(String(email).toLowerCase());
          }

          $scope.download = function (type) {

            if ($scope.dwFormFirstName.length < 3) {
              $scope.dwFormMessage = "Please enter a valid first name";
              $scope.dwFormMessageColor = "#ff0000";
              return;
            }

            if ($scope.dwFormLastName.length < 3) {
              $scope.dwFormMessage = "Please enter a valid surname";
              $scope.dwFormMessageColor = "#ff0000";
              return;
            }

            if ($scope.dwFormEmail.length < 3 || !(validateEmail($scope.dwFormEmail))) {
              $scope.dwFormMessage = "Please enter a valid email";
              $scope.dwFormMessageColor = "#ff0000";
              return;
            }

            API.downloadrequest({
              name: $scope.dwFormFirstName,
              surname: $scope.dwFormLastName,
              email: $scope.dwFormEmail,
              organization: $scope.dwFormOrganization,
              notes: $scope.dwFormNotes
            }, function (msg) {
              $scope.dwFormMessage = "";
              $scope.dwFormMessageColor = "#000000";

              if (!(type === "json") && !(type === "csv")) return;
              let fileName = "synner-data." + type;
              let numRows = $scope.model.dataVolume - $scope.model.dataRows;
              let req = $scope.model.getGenerationRequest(true, numRows);
              if (req !== null) {
                API.generate(req, function (res) {
                  let processed = [];
                  if (type === "json") processed = $scope.processJSON(res.data);
                  else if (type === "csv") processed = $scope.processCSV(res.data);
                  $scope.saveData(processed, fileName, type);
                })
              }

            }, function (msg) {
              $scope.dwFormMessage = "An error occurred, it wasn't possible to download the data";
              $scope.dwFormMessageColor = "#ff0000";
            });

          };

        }
      };
    }]);