angular.module('Synner')
    .directive('generatorVisrel', ['Model', 'Functions', '$rootScope', '$timeout', 'Parameters', function (Model, Functions, $rootScope, $timeout, Parameters) {
      return {
        templateUrl: 'fragments/generator-visrel.html',
        replace: true,
        restriction: 'E',
        scope: {
          _result: '=result', // where we will put the result of generation specifications
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.inputRead = false;
          $scope.paper = null;
          $scope.simplot = {
            MARGIN: {top: 5, right: 20, bottom: 25, left: 45}
          }; // everything about the simulation plot, svg, path, simulation arrays...

          $scope.selectedInputField = $scope.field.dependencies[0];
          $scope.possibleInputFields = [];

          var GRAPH_PADDING = 0,
              LINE_X_POINTS = 10,
              LINE_WIDTH = 3,
              MAX_DATA_VOL = 500,
              MAIN_LINE_COLOR = '#1b6da8';

          var $canvas = element.find('canvas');
          var height = $canvas.height();
          var width = $canvas.width();
          $scope.sourceMin = null;
          $scope.sourceMax = null;
          $scope.targetMin = null;
          $scope.targetMax = null;
          $scope.noises = 1;
          $scope.path = undefined;
          $scope.visrelPoints = null;
          $scope.simSamples = [];
          $scope.simSamplesBoundaries = { min : null, max: null};
          $scope.pathNoises = [];
          $scope.noisesTranslation = function (x, uiToRaw) {
            if (uiToRaw) return x * x / 40000;
            return Math.sqrt(x) * Math.sqrt(40000);
          };
          $scope.noiseToNoisePerc = function (x) {
            // from the noise in the model ($scope.noise, which goes from 0 to 200) to [0,1]
            return x * x / 40000;
          };
          $scope.noisePercToNoise = function (x) {
            // from the noise [0,1] to the noise in the model [0,200]
            return Math.sqrt(x) * Math.sqrt(40000);
          };
          $scope.noisePercToDataRangeNoise = function (x) {
            // from the noise [0,1] to the noise in related to the current data range [$scope.targetMin, scope.targetMax]
            return x * 2 * ($scope.targetMax - $scope.targetMin);
          };

          // Standard Normal variate using Box-Muller transform.
          function randn_bm() {
            var u = 0, v = 0;
            while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
            while (v === 0) v = Math.random();
            return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
          }

          function simulateGenerations() {
            var discretisation = 100;
            var discretisationBucketSize = 1 / discretisation;
            var visrelConf = $scope._result.obj.visrel;
            $scope.simSamplesBoundaries.min = $scope.targetMin;
            $scope.simSamplesBoundaries.max = $scope.targetMax;
            $scope.simSamples = [];
            $scope.simSamplesPosAreas = [];
            $scope.simSamplesNegAreas = [];

            if (visrelConf.in.length === 0) return; // empty sketch means no sim

            var dataVolume = Math.min(MAX_DATA_VOL, Model.dataVolume);
            var normalizedNoiseVal = $scope.noiseToNoisePerc($scope.noises);
            for (var i = 0; i < Model.experimentsNumber; i++) {
              var samples = [];
              var samplesPosAreas = [[0,0,0]];
              var samplesNegAreas = [[0,0,0]];
              var discretisationBucket = 0;
              var currentMaxPt = {ptx: 0, pty: 0, ptyn: 0};
              var currentMinPt = {ptx: 0, pty: 0, ptyn: 0};

              for (var xi = 0; xi < dataVolume; xi++) {
                var ptx = xi / dataVolume + (1 / dataVolume / Model.experimentsNumber) * i;
                var pty = 0;
                var found = false;
                for (var pos = 0; pos < visrelConf.in.length; pos++) {
                  if (visrelConf.in[pos] >= ptx) {
                    found = true;
                    pty = visrelConf.out[pos];
                    break;
                  }
                }
                if (!found) pty = visrelConf.out[visrelConf.out.length - 1];
                var ptyn = pty + randn_bm() * normalizedNoiseVal;
                samples.push([ptx, ptyn]);

                if (ptx >= (discretisationBucket + 1) * discretisationBucketSize) {
                  if (currentMaxPt !== null) samplesPosAreas.push([currentMaxPt.ptx, currentMaxPt.pty, currentMaxPt.ptyn]);
                  if (currentMinPt !== null) samplesNegAreas.push([currentMinPt.ptx, currentMinPt.pty, currentMinPt.ptyn]);
                  currentMaxPt = null;
                  currentMinPt = null;
                  discretisationBucket++;
                }

                // if (currentMinPt === null) currentMinPt = {ptx: ptx, pty: pty, ptyn: ptyn};
                // if (currentMaxPt === null) currentMaxPt = {ptx: ptx, pty: pty, ptyn: ptyn};
                if (ptyn < pty) {
                  if (currentMinPt === null || currentMinPt.ptyn > ptyn) {
                    currentMinPt = {ptx: ptx, pty: pty, ptyn: ptyn};
                  }
                  //samplesNegAreas.push([ptx, pty, ptyn]);
                } else {
                  if (currentMaxPt === null || currentMaxPt.ptyn < ptyn) {
                    currentMaxPt = {ptx: ptx, pty: pty, ptyn: ptyn};
                  }
                  //samplesPosAreas.push([ptx, pty, ptyn]);
                }

                var ptyVal = pty * ($scope.targetMax - $scope.targetMin) + $scope.targetMin;
                var ptynVal = ptyn * ($scope.targetMax - $scope.targetMin) + $scope.targetMin;
                if ($scope.simSamplesBoundaries.min > ptyVal) $scope.simSamplesBoundaries.min = ptyVal;
                if ($scope.simSamplesBoundaries.min > ptynVal) $scope.simSamplesBoundaries.min = ptynVal;
                if ($scope.simSamplesBoundaries.max < ptyVal) $scope.simSamplesBoundaries.max = ptyVal;
                if ($scope.simSamplesBoundaries.max < ptynVal) $scope.simSamplesBoundaries.max = ptynVal;
              }

              if (currentMaxPt !== null) samplesPosAreas.push([currentMaxPt.ptx, currentMaxPt.pty, currentMaxPt.ptyn]);
              if (currentMinPt !== null) samplesNegAreas.push([currentMinPt.ptx, currentMinPt.pty, currentMinPt.ptyn]);
              samplesNegAreas.push([1,1,1]);
              samplesPosAreas.push([1,1,1]);

              $scope.simSamples.push(samples);
              $scope.simSamplesPosAreas.push(samplesPosAreas);
              $scope.simSamplesNegAreas.push(samplesNegAreas);
            }

          }

          function updateResult() {
            if (!$scope.inputRead) return; // Prevent changes on the distribution parameters to change the input, even before reading it

            $scope.visrelPoints = extractPoints();
            var generator = {
              'visrel': {
                'input-field': $scope.selectedInputField.name,
                'in': [],
                'out': [],
                'noises': $scope.noiseToNoisePerc($scope.noises),
                'in-min': $scope.sourceMin,
                'in-max': $scope.sourceMax,
                'out-min': $scope.targetMin,
                'out-max': $scope.targetMax,
                'approximation': 'interpolate'
              }
            };

            if ($scope.visrelPoints !== null) {
              for (var i = 0; i < $scope.visrelPoints.length; i++) {
                generator['visrel']['in'].push($scope.visrelPoints[i][0]);
                generator['visrel']['out'].push($scope.visrelPoints[i][1]);
              }
            }

            $scope._result.obj = generator;
            $scope.inputRead = true;
          }

          function readResult() {
            if ($scope.inputRead) return;

            var generator = $scope._result.obj;
            if (generator && Model.isVisualRelationship(generator)) {
              $scope.cleanSketch();
              var cm = generator['visrel'];
              var inVals = cm['in'];
              var outVals = cm['out'];
              var inputField = cm['input-field'];
              $scope.selectedInputField = null;
              for (var dep of $scope.field.dependencies) {
                if (dep.name === inputField) {
                  $scope.selectedInputField = dep;
                  break;
                }
              }
              $scope.sourceMin = cm['in-min'];
              $scope.sourceMax = cm['in-max'];
              $scope.targetMin = cm['out-min'];
              $scope.targetMax = cm['out-max'];
              $scope.noises = cm['noises'] ? $scope.noisePercToNoise(cm['noises']) : 0;

              paintCanvasPath(inVals, outVals);
              updateSimPlot();
            } else {
              if ($scope.selectedInputField === null) {
                $scope.selectedInputField = Model.filterNumericFields($scope.field.dependencies)[0];
              }
              inferArguments();
              $scope.drawSketch('linear');
            }

            $scope.inputRead = true;
          }

          function inferArguments() {
            var sourceSamples = Model.getSamples($scope.selectedInputField);
            var targetSamples = Model.getSamples($scope.field);
            if (targetSamples.length > 0) {
              $scope.targetMin = _.min(targetSamples);
              $scope.targetMax = _.max(targetSamples);
            } else {
              $scope.targetMin = 0;
              $scope.targetMax = 1;
            }

            if ($scope.targetMin === $scope.targetMax) {
              $scope.targetMin -= 5;
              $scope.targetMax += 5;
            }

            if (sourceSamples.length > 0) {
              $scope.sourceMin = _.min(sourceSamples);
              $scope.sourceMax = _.max(sourceSamples);
            } else {
              $scope.sourceMin = 0;
              $scope.sourceMax = 1;
            }

            if ($scope.sourceMin === $scope.sourceMax) {
              $scope.sourcMin -= 5;
              $scope.sourceMax += 5;
            }
          }

          //region CANVAS

          function paintCanvasPath(inVals, outVals) {
            if (inVals.length === 0 || outVals.length === 0) return;
            $scope.path = new $scope.paper.Path();
            var h = height - 2 * GRAPH_PADDING, w = width - 2 * GRAPH_PADDING;
            for (var i = 0; i < inVals.length; i++) {
              var outValIdx = Math.floor((i / inVals.length) * outVals.length);
              $scope.path.add(new $scope.paper.Point(inVals[i] * w + GRAPH_PADDING, h - outVals[outValIdx] * h + GRAPH_PADDING));
            }
            $scope.path.simplify();
            $scope.path.opacity = 0;
            $canvas.hide();
          }

          function extractPoints(granularityStep) {
            if ($scope.path === undefined || $scope.path.length === 0) return null;
            if (!granularityStep) granularityStep = 0.1;

            var points = [], px, p, i;
            px = $scope.path.getPointAt(0).x;
            var minX = Number.MAX_SAFE_INTEGER;
            var maxX = Number.MIN_SAFE_INTEGER;
            var minY = Number.MAX_SAFE_INTEGER;
            var maxY = Number.MIN_SAFE_INTEGER;
            for (i = 0; i <= $scope.path.length; i += granularityStep) {
              p = $scope.path.getPointAt(i);
              if (p.x > px) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              }
            }
            for (i = 0; i <= $scope.path.length; i += granularityStep) {
              p = $scope.path.getPointAt(i);
              if (p.x > px) {
                points.push([ (p.x - minX) / (maxX - minX), 1 - ((p.y - minY) / (maxY - minY)) ]);
                px += 1;
              }
            }
            return points;
          }

          function checkPointCompatible(point) {
            var currentSegments = $scope.path.segments;
            if (currentSegments.length === 0) return true;
            return point.x >= currentSegments[currentSegments.length - 1].point.x;
          }

          /* UI callback */
          $scope.drawSketch = function (type, xVals, yVals) {
            var i;

            $scope.cleanSketch();
            $scope.paper.activate();
            $scope.path = new $scope.paper.Path();

            var h = height - 2 * GRAPH_PADDING, w = width - 2 * GRAPH_PADDING;
            switch (type) {
              case 'exp':
                for (i = 1; i < LINE_X_POINTS; i++) {
                  $scope.path.add(new $scope.paper.Point(i / LINE_X_POINTS * w + GRAPH_PADDING, h - (i * i) / (LINE_X_POINTS * LINE_X_POINTS) * h + GRAPH_PADDING));
                }
                break;
              case 'log':
                var maxv = Math.log(LINE_X_POINTS);
                for (i = 1; i < LINE_X_POINTS; i++) {
                  $scope.path.add(new $scope.paper.Point(i / LINE_X_POINTS * w + GRAPH_PADDING, h - Math.log(i) / maxv * h + GRAPH_PADDING));
                }
                break;
              case 'linear':
                for (i = 1; i < LINE_X_POINTS; i++) {
                  $scope.path.add(new $scope.paper.Point(i / LINE_X_POINTS * w + GRAPH_PADDING, h - i / LINE_X_POINTS * h + GRAPH_PADDING));
                }
                break;
              default:
                for (i = 1; xVals.length; i++) {
                  $scope.path.add(new $scope.paper.Point(xVals[i] * w + GRAPH_PADDING, h - yVals[i] * h + GRAPH_PADDING));
                }
                break;
            }
            $scope.path.opacity = 0;
            $canvas.hide();
            updateResult();
          };

          $scope.cleanSketch = function () {
            $scope.paper.activate();

            $scope.paper.project.clear();
            $scope.paper.view.draw();

            if ($scope.path) $scope.path.clear();
            $canvas.show();
            $scope.path = undefined;
          };

          $scope.clean = function () {
            $scope.cleanSketch();
            updateResult();
          };

          function initPaper() {
            $scope.paper = new paper.PaperScope();
            for (var i = 0; i < $scope.paper.projects.length; i++) $scope.paper.projects[i].remove();
            $scope.paper.remove();
            $scope.paper.setup($canvas[0]);

            $scope.tool = new $scope.paper.Tool();
            $scope.tool.onMouseDown = function (event) {
              $scope.cleanSketch();
              render(true);
              $scope.path = new $scope.paper.Path();
              $scope.path.strokeColor = MAIN_LINE_COLOR;
              $scope.path.strokeWidth = LINE_WIDTH;
              $scope.path.strokeCap = 'round';
              $scope.path.strokeJoin = 'round';
            };
            $scope.tool.onMouseDrag = function (event) {
              if (!$scope.path) return;
              $scope.path.smooth();
              if (!checkPointCompatible(event.point)) return;
              $scope.path.add(event.point);
              $scope.path.add(event.point);
            };
            $scope.tool.onMouseUp = function (event) {
              if (!$scope.path) return;
              $scope.path.opacity = 0;
              $canvas.hide();
              updateResult();
              $scope.$apply();
            };

            $scope.cleanSketch();
          }

          initPaper();

          //endregion

          //region PLOT

          function updateSimPlot() {
            if (!$scope.simplot.svg) initGraph();
            $scope.simplot.graphData = $scope.visrelPoints;
            simulateGenerations();
            $timeout(render);
          }

          function initGraph() {
            var simplotc = $scope.simplot;

            simplotc.svg = d3.select(element.find('.visrel-simplot')[0]);

            // scales
            simplotc.x = d3.scale.linear();
            simplotc.y = d3.scale.linear();

            // axis
            simplotc.xAxis = d3.svg.axis().orient('bottom');
            simplotc.yAxis = d3.svg.axis().orient('left');
            simplotc.chartWrapper = simplotc.svg.append('g');
            simplotc.chartWrapper.append('g').classed('x axis', true).style('font-size','9px');
            simplotc.chartWrapper.append('g').classed('y axis', true).style('font-size','9px');

            // Simulations
            simplotc.samplesPosAreas = [];
            simplotc.samplesNegAreas = [];
            var samplesAreasG = simplotc.chartWrapper.append('g').classed('samples-areas', true);
            for (var i = 0; i < Model.experimentsNumber; i++) {
              simplotc.samplesPosAreas.push(samplesAreasG.append('path').classed('sample-area', true).attr('exp-id', i));
              simplotc.samplesNegAreas.push(samplesAreasG.append('path').classed('sample-area', true).attr('exp-id', i));
            }
            simplotc.samplesScatterplot = simplotc.chartWrapper.append('g').classed('scatterplot', true);

            simplotc.path = simplotc.chartWrapper.append('path').classed('line', true);

            simplotc.d0ToX = function (d) {
              return simplotc.x(d[0] * ($scope.sourceMax - $scope.sourceMin) + $scope.sourceMin);
            };

            simplotc.d1ToY = function (d) {
              return simplotc.y(d[1] * ($scope.targetMax - $scope.targetMin) + $scope.targetMin);
            };

            simplotc.d2ToY = function (d) {
              return simplotc.y(d[2] * ($scope.targetMax - $scope.targetMin) + $scope.targetMin);
            };

            addMouseOverInfo();

            return true;
          }

          $scope.removeScatterplotTimeout = null;
          function addMouseOverInfo() {
            element
                .off('mouseover')
                .off('mouseout')
                .on('mouseover', '.sample-area', function () {
                  if ($scope.removeScatterplotTimeout) {
                    clearTimeout($scope.removeScatterplotTimeout);
                    $scope.removeScatterplotTimeout = null;
                  }
                  var id = d3.select(this).attr('exp-id');
                  renderScatterplot(id);
                })
                .on('mouseout', '.sample-area', function () {
                  $scope.removeScatterplotTimeout = setTimeout(function () {
                    element.find('.sample-area').removeClass('highlighted');
                    cleanScatterplot();
                  }, 2000);
                });
          }

          function renderScatterplot(expNum) {
            var simplotc = $scope.simplot;

            cleanScatterplot();

            var samplesAreas = element.find('.sample-area');
            for (var i = 0; i < samplesAreas.length; i++) {
              var sa = samplesAreas.eq(i);
              var expId = sa.attr('exp-id');
              if (expId == expNum) {
                sa.addClass('highlighted');
              } else {
                sa.removeClass('highlighted');
              }
            }

            var sp = $scope.simplot.samplesScatterplot.selectAll('.sample-dot').data($scope.simSamples[expNum]);
            sp.exit().remove();
            sp.attr('cx', simplotc.d0ToX)
                .attr('cy', simplotc.d1ToY);
            sp.enter().append('circle')
                .attr('class', 'sample-dot')
                .attr('r', 1)
                .attr('cx', simplotc.d0ToX)
                .attr('cy', simplotc.d1ToY);
          }

          function cleanScatterplot() {
            element.find('.sample-area').removeClass('highlighted');
            var sp = $scope.simplot.samplesScatterplot.selectAll('.sample-dot').data([]);
            sp.exit().remove();
          }

          function render(dontConsiderNoises) {
            var simplotc = $scope.simplot;
            if (!simplotc.svg) return;

            //get dimensions
            var graphWidth = element.find('.visrel-simplot').width();
            var graphHeight = element.find('.visrel-simplot').height();
            simplotc.graphWidth = graphWidth - simplotc.MARGIN.left - simplotc.MARGIN.right;
            simplotc.graphHeight = graphHeight - simplotc.MARGIN.top - simplotc.MARGIN.bottom;

            //update x and y scales to new dimensions
            simplotc.svg
                .attr('width', simplotc.graphWidth + simplotc.MARGIN.right + simplotc.MARGIN.left)
                .attr('height', simplotc.graphHeight + simplotc.MARGIN.top + simplotc.MARGIN.bottom);
            simplotc.chartWrapper
                .attr('transform', 'translate(' + simplotc.MARGIN.left + ',' + simplotc.MARGIN.top + ')');
            simplotc.x.range([0, simplotc.graphWidth]);
            simplotc.y.range([simplotc.graphHeight, 0]);
            simplotc.xAxis.scale(simplotc.x);
            simplotc.yAxis.scale(simplotc.y);
            simplotc.svg.select('.x.axis')
                .attr('transform', 'translate(0,' + simplotc.graphHeight + ')')
                .call(simplotc.xAxis);
            simplotc.svg.select('.y.axis')
                .call(simplotc.yAxis);
            simplotc.area = d3.svg.area()
                .x(simplotc.d0ToX)
                .y0(simplotc.d1ToY)
                .y1(simplotc.d2ToY);
            simplotc.area.interpolate('cardinal');

            cleanScatterplot();

            // Change data
            simplotc.x.domain([$scope.sourceMin, $scope.sourceMax]);
            if (dontConsiderNoises) {
              simplotc.y.domain([$scope.targetMin, $scope.targetMax]);
            } else {
              simplotc.y.domain([$scope.simSamplesBoundaries.min, $scope.simSamplesBoundaries.max]);
            }

            element.find('.target-max').css('top', simplotc.y($scope.targetMax));
            element.find('.target-min').css('top', simplotc.y($scope.targetMin)).css('bottom', null);

            simplotc.xAxis.scale(simplotc.x);
            simplotc.yAxis.scale(simplotc.y);

            for (var i = 0; i < Model.experimentsNumber; i++) {
              simplotc.samplesPosAreas[i]
                  .attr('d', simplotc.area($scope.simSamplesPosAreas[i] ? $scope.simSamplesPosAreas[i] : []));
              simplotc.samplesNegAreas[i]
                  .attr('d', simplotc.area($scope.simSamplesNegAreas[i] ? $scope.simSamplesNegAreas[i] : []));
            }

            simplotc.line = d3.svg.line()
                .x(function (d) { return simplotc.x(d[0] * ($scope.sourceMax - $scope.sourceMin) + $scope.sourceMin); })
                .y(function (d) { return simplotc.y(d[1] * ($scope.targetMax - $scope.targetMin) + $scope.targetMin); });
            simplotc.line.interpolate('cardinal');
            simplotc.path
                .classed('theoretical-line', true)
                .attr('d', simplotc.line($scope.visrelPoints === null ? [] : $scope.visrelPoints));

            simplotc.svg.select('.x.axis').call(simplotc.xAxis);
            simplotc.svg.select('.y.axis').call(simplotc.yAxis);
          }

          initGraph();


          //endregion

          $scope.$watchCollection(function () {
            return [$scope.sourceMin, $scope.sourceMax, $scope.targetMax, $scope.targetMin, $scope.noises, Model.dataVolume];
          }, function () {
            updateResult();
          });

          $scope.$watch('_result.obj', function () {
            $scope.inputRead = false;
            readResult();
          });
          $scope.$watchCollection('field.dependencies', function () {
            $scope.possibleInputFields = Model.filterNumericFields($scope.field.dependencies);
            $scope.selectedInputField = $scope.possibleInputFields[0];
          });

        }
      };
    }]);

