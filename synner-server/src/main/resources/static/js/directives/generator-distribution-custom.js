angular.module('Synner')
    .directive('generatorDistributionCustom', ['$rootScope', '$timeout', 'Infer', 'Parameters', function ($rootScope, $timeout, Infer, Parameters) {
      return {
        templateUrl: 'fragments/generator-distribution-custom.html',
        replace: true,
        restriction: 'E',
        scope: {
          distribution: '=', // where we will put the result of generation specifications
          _result: '=result', // where we will put the result of generation specifications
          field: '=',
          compactView: '='
        },
        link: function ($scope, element, attrs) {
          var GRAPH_PADDING = 5.5, ARROW_SIZE = 4.5;
          var GRAPH_POINTS = 10;
          $scope.distParameters = {
            min: 0, // used for all the distributions that can start and end in a specific range
            max: 1, // used for all the distributions that can start and end in a specific range
          };
          $scope.pathFinalized = false;
          $scope.histogram = null;

          document.getPath = function () {
            return $scope.path;
          };

          $scope.inputRead = false;
          var $canvas = element.find('canvas');

          function updateResult() {
            if (!$scope.inputRead) return;
            if (!$scope._result) return; // in case the directive is active without any result specified

            var generator = {
              distribution: 'custom',
              histogram: $scope.histogram,
              min: $scope.distParameters.min,
              max: $scope.distParameters.max
            };

            $scope._result.obj = generator;
          }

          function inferDistParameters() {
            var stats = Infer.inferDistribution($scope.field);
            if (!stats) {
              $scope.distParameters.min = 0;
              $scope.distParameters.max = 1;
            } else {
              $scope.distParameters.min = stats.min();
              $scope.distParameters.max = stats.max();
            }
          }

          function readResult() {

            // Prevent reading if there is no need
            if ($scope.inputRead) return;

            var obj = $scope._result.obj;
            if (obj.distribution !== 'custom') return;

            if (obj.min === undefined || obj.max === undefined) {
              inferDistParameters();
            } else {
              $scope.distParameters.min = obj.min;
              $scope.distParameters.max = obj.max;
            }
            $scope.histogram = !obj.histogram ? null : obj.histogram;

            $scope.inputRead = true;

            $timeout(initPlot);
          }

          function updatePoints() {
            var i, points = [];
            $scope.histogram = [];

            var px = $scope.path.getPointAt(0).x;
            var step = $scope.path.length / GRAPH_POINTS;
            for (i = 0; i <= $scope.path.length; i += step) {
              var p = $scope.path.getPointAt(i);
              if (p.x > px) {
                points.push({ x: p.x, y: p.y });
                px += 1;
              }
            }

            var maxX = _.max(points, 'x').x, maxY = _.max(points, 'y').y;
            var minX = _.min(points, 'x').x, minY = _.min(points, 'y').y;
            var plotMinY = GRAPH_PADDING, plotMaxY = $scope.height - GRAPH_PADDING;
            var plotMinX = GRAPH_PADDING, plotMaxX = $scope.width - GRAPH_PADDING;

            var fx = (plotMaxX - plotMinX) / (maxX - minX);
            var fy = (plotMaxY - plotMinY) / (maxY - minY);

            var oldPath = $scope.path;
            $scope.path = new paper.Path();
            var area = 0;
            for (i = 0; i < points.length; i++) {
              $scope.path.add(new paper.Point((points[i].x - minX) * fx + GRAPH_PADDING , (points[i].y - minY) * fy + GRAPH_PADDING)) ;
              points[i].x = (points[i].x - minX) / (maxX - minX);
              points[i].y = (maxY - points[i].y) / (maxY - minY);
              $scope.histogram.push(points[i].y);
              area += points[i].y;
            }

            $scope.maxY = 1/area;

            // Proof that the area of the resized histogram is 1
            // var newArea = 0.0;
            // for (i = 0; i < points.length; i++) {
            //   newArea += points[i].y * (1.0/area);
            // }
            // console.log('area = ', area, ' points = ', points.length, 'hf = ', 1/area, ' newarea = ', newArea );

            $scope.path.strokeColor = '#e54c4c';
            $scope.path.strokeWidth = 3;
            oldPath.replaceWith($scope.path);
            updateResult();
            $scope.$apply();
          }

          function drawHistogram() {
            if ($scope.histogram === null) {
              $scope.path = null;
              $scope.pathFinalized = false;
              return;
            }
            $scope.path = new paper.Path();
            var area = 0;
            var xStep = ($scope.width - 2 * GRAPH_PADDING) / $scope.histogram.length;
            for (var i = 0; i < $scope.histogram.length; i++) {
              $scope.path.add(new paper.Point(i * xStep + GRAPH_PADDING , (1 - $scope.histogram[i]) * ($scope.height - 2 * GRAPH_PADDING) + GRAPH_PADDING));
              area += $scope.histogram[i];

            }
            $scope.maxY = 1/area;
            $scope.path.strokeColor = '#e54c4c';
            $scope.path.strokeWidth = 3;
            $scope.pathFinalized = true;

            $scope.$apply();
          }

          function checkPointCompatible(point) {
            var currentSegments = $scope.path.segments;
            if (currentSegments.length === 0) return true;
            return point.x >= currentSegments[currentSegments.length - 1].point.x;
          }

          function initPlot() {
            for (var i = 0; i < paper.projects.length; i++) paper.projects[i].remove();
            for (var i = 0; i < paper.tools.length; i++) paper.tools[i].remove();
            paper.setup($canvas[0]);

            $scope.tool = new paper.Tool();
            $scope.tool.onMouseDown = function (event) {
              if ($scope.path) {
                console.log('path is not null with mouse down');
                return;
              }
              $scope.path = new paper.Path();
              $scope.path.strokeColor = '#e54c4c';
              $scope.path.strokeWidth = 3;
              $scope.path.strokeCap = 'round';
              $scope.path.strokeJoin = 'round';
            };
            $scope.tool.onMouseDrag = function (event) {
              if ($scope.pathFinalized) return;
              $scope.path.smooth();
              if (!checkPointCompatible(event.point)) return;
              $scope.path.add(event.point);
              $scope.path.add(event.point);
            };
            $scope.tool.onMouseUp = function (event) {
              if ($scope.pathFinalized) return;
              $scope.pathFinalized = true;
              $scope.path.simplify();
              updatePoints();
              updateResult();
            };

            drawPlot();
            drawHistogram();
          }

          function drawPlot() {
            $scope.height = $canvas.height();
            $scope.width = $canvas.width();

            var origin = new paper.Point(GRAPH_PADDING, $scope.height - GRAPH_PADDING);
            var axis = new paper.Group([
              new paper.Path([
                origin,
                new paper.Point(GRAPH_PADDING, GRAPH_PADDING)
              ]),
              new paper.Path([
                new paper.Point(GRAPH_PADDING - ARROW_SIZE, GRAPH_PADDING),
                new paper.Point(GRAPH_PADDING, GRAPH_PADDING),
              ]),
              new paper.Path([
                origin,
                new paper.Point($scope.width - GRAPH_PADDING, $scope.height - GRAPH_PADDING),
              ]),
              new paper.Path([
                new paper.Point($scope.width - GRAPH_PADDING, $scope.height - GRAPH_PADDING + ARROW_SIZE),
                new paper.Point($scope.width - GRAPH_PADDING, $scope.height - GRAPH_PADDING)
              ])
            ]);
            axis.strokeWidth = 1;
            axis.strokeColor = '#000000';
          }

          $scope.cleanSketch = function () {
            paper.project.clear();
            paper.view.draw();
            $scope.path = null;
            $scope.pathFinalized = false;
            $scope.histogram = null;
            updateResult();
            drawPlot();
          };

          $scope.$watch('distribution', updateResult);
          $scope.$watch('distParameters', updateResult, true);
          $scope.$watch('_result', function () {
            $scope.inputRead = false;
            readResult();
          }, true);
        }
      };
    }]);

