angular.module('Synner')
    .directive('generatorDistribution', ['$rootScope', '$timeout', 'Model', 'Infer', 'Parameters', function ($rootScope, $timeout, Model, Infer, Parameters) {
      return {
        templateUrl: 'fragments/generator-distribution.html',
        replace: true,
        restriction: 'E',
        scope: {
          distribution: '=', // where we will put the result of generation specifications
          _result: '=result',
          field: '=',
          enabled: '=',
          compactView: '=',
          labels: '='
        },
        link: function ($scope, element, attrs) {
          var INTERVALS = 50;

          $scope.dataVolume = Model.dataVolume;
          $scope.experimentsNumber = Model.experimentsNumber;

          // Plot contants
          $scope.GRAPH_HEIGHT = 250;
          $scope.GRAPH_WIDTH = 3 * $scope.GRAPH_HEIGHT;
          $scope.MARGIN = {top: 5, right: 5, bottom: 40, left: 50};

          $scope.closeUpHeight = 30;

          $scope.model = Model;
          $scope.inputRead = false;
          $scope.marginTop = 40;
          $scope.dataGenerationReqTimeout = null;
          $scope.distrFunctions = {
            distribution: undefined, // the jstat object that represents the distribution
            sample: undefined, // function which will sample a value of the distribution
            pdf: undefined, // function which accepts a value and gives the pdf of that value
            cdf: undefined // function which accepts a value and gives the cdf of that value
          };
          $scope.distParameters = {
            min: 0, // used for all the distributions that can start and end in a specific range
            max: 1, // used for all the distributions that can start and end in a specific range
            rate: 1, // used for exponential distribution 1.0251355942973368 borderline outstide    2 outside
            mean: 30, // used gaussian 30.779466958499995 borderline outstide   35 outside
            stdev: 5, // used for gaussian  5.138736292550285 borderline outside    7 outside
            shape: 3, // used for gamma (equivalent to k) 3.6084724011948155 borderline outstide    4 outside
            scale: 2 // used for gamma (equivalent to k)1.7550710765363955 borderline outstide      3 outside
          };
          $scope.graphVisibility = 'hidden';

          // Plot with and height
          $scope.graphWidth = 0;
          $scope.graphHeight = 0;

          // The entire available space width and height
          $scope.availableSpace = {width: 0, height: 0};

          function inferDistParameters() {
            var stats = Infer.inferDistribution($scope.field);
            if (!stats) {
              $scope.distParameters.stdev = 1;
              $scope.distParameters.min = 0;
              $scope.distParameters.max = 1;
              $scope.distParameters.mean = 0;
            } else {
              $scope.distParameters.stdev = parseFloat(stats.stdev().toFixed(2));
              $scope.distParameters.min = parseFloat(stats.min().toFixed(2));
              $scope.distParameters.max = parseFloat(stats.max().toFixed(2));
              $scope.distParameters.mean = parseFloat(stats.mean().toFixed(2));
            }
            $scope.distParameters.rate = 1;
          }

          function readResult() {

            // Prevent reading if there is no need
            if ($scope.inputRead) return;

            var obj = $scope._result.obj;

            if (!obj) {
              inferDistParameters();
            } else {
              switch ($scope.distribution) {
                case 'uniform':
                  if (obj.min === undefined || obj.max === undefined) inferDistParameters();
                  else {
                    $scope.distParameters.min = obj.min;
                    $scope.distParameters.max = obj.max;
                  }
                  break;
                case 'gaussian':
                  if (obj.mean === undefined || obj.stdev === undefined) inferDistParameters();
                  else {
                    $scope.distParameters.mean = obj.mean;
                    $scope.distParameters.stdev = obj.stdev;
                  }
                  break;
                case 'exponential':
                  if (obj.rate === undefined) inferDistParameters();
                  else {
                    $scope.distParameters.rate = obj.rate;
                  }
                  break;
              }
            }

            $scope.inputRead = true;
            if (!obj) updateGraph(); // update the result with the default values
          }

          function generatingResult() {
            var generator = {
              distribution: $scope.distribution
            };

            switch ($scope.distribution) {
              case 'gaussian':
                generator.mean = $scope.distParameters.mean;
                generator.stdev = $scope.distParameters.stdev;
                break;
              case 'exponential':
                generator.rate = $scope.distParameters.rate;
                break;
              case 'uniform':
                generator.min = $scope.distParameters.min;
                generator.max = $scope.distParameters.max;
            }

            return generator;
          }


          function updateResult() {
            if (!$scope.inputRead) return; // Prevent changes on the distribution parameters to change the input, even before reading it
            if (!$scope._result) return; // in case the directive is active without any result specified

            $scope._result.obj = generatingResult();
            updateGraph();
          }

          function updateGraph() {
            if (!$scope.svg) initGraph();

            $scope.dataVolume = Model.dataVolume;
            $scope.experimentsNumber = Model.experimentsNumber;
            $scope.distrFunctions = buildDistrFunctions($scope.distribution, $scope.distParameters);
            var distrRangeInfo = updateDistrRange($scope.distrFunctions, $scope.distParameters, $scope.rangeX);
            $scope.distrRange = distrRangeInfo.distrRange;
            $scope.distrRangeStep = distrRangeInfo.distrRangeStep;
            var thData = generateTheoreticalDistributionData($scope.distribution, $scope.distrFunctions,
                $scope.distrRange, $scope.distrRangeStep, $scope.distParameters);
            $scope.graphData = thData.data;
            updateParametersProbs($scope.distribution, thData.parametersProbs);

            $scope.samplesAvailable = true;
            for (var i = 0; i < $scope.experimentsNumber; i++) generateSampledDistributionData(i);

            $timeout(render);
          }

          function initGraph() {
            $scope.svg = d3.select(element.find('.distribution-plot')[0]);

            // scales
            $scope.x = d3.scale.linear();
            $scope.y = d3.scale.linear();

            // axis
            $scope.xAxis = d3.svg.axis().orient('bottom');
            $scope.yAxis = d3.svg.axis().orient('left');
            if ($scope.labels) {
              $scope.svg.append('text')
                  .attr('class', 'x label')
                  .text($scope.labels.x)
                  .attr('text-anchor', 'middle');
              $scope.svg.append('text')
                  .attr('class', 'y label')
                  .text($scope.labels.y)
                  .attr('transform', 'rotate(-90)')
                  .attr('text-anchor', 'middle');
            }

            $scope.chartWrapper = $scope.svg.append('g');
            $scope.chartWrapper.append('g').classed('x axis', true);
            $scope.chartWrapper.append('g').classed('y axis', true);
            $scope.chartWrapper.append('line').classed('left-std-dev', true);
            $scope.chartWrapper.append('line').classed('right-std-dev', true);
            $scope.chartWrapper.append('line').classed('mean', true);
            $scope.path = $scope.chartWrapper.append('path').classed('line', true);

            $scope.samples = [];
            $scope.samplesAvailable = false;
            for (var i = 0; i < $scope.experimentsNumber; i++) {
              $scope.samples.push({
                id: i,
                path: undefined,
                area: undefined,
                x: d3.scale.linear(),
                y: d3.scale.linear(),
              });
            }

            $scope.minMax = $scope.chartWrapper.append('path').classed('sample-area', true);

            $scope.areaSamplesContainer = $scope.chartWrapper.append('g').classed('area-samples', true);
            for (var i = 0; i < $scope.experimentsNumber; i++) {
              $scope.samples[i].area = $scope.areaSamplesContainer.append('path').classed('sample-area', true);
            }

            $scope.samplesContainer = $scope.chartWrapper.append('g').classed('samples', true);
            for (var i = 0; i < $scope.experimentsNumber; i++) {
              var samplePath = $scope.samplesContainer.append('path').classed('sample', true);
              samplePath.attr('exp-id', i);
              $scope.samples[i].path = samplePath;
            }

            $scope.histogram = $scope.chartWrapper.append('g').classed('histogram', true);

            $scope.meanCloseup = d3.select(element.find('.mean-closeup svg')[0]);
            $scope.meanCloseup.append('g').append('g').classed('samples', true);
            $scope.meanCloseup.attr('height', $scope.closeUpHeight);
            $scope.stdevCloseup = d3.select(element.find('.stdev-closeup svg')[0]);
            $scope.stdevCloseup.append('g').append('g').classed('samples', true);
            $scope.stdevCloseup.attr('height', $scope.closeUpHeight);

            $scope.rateCloseup = d3.select(element.find('.rate-closeup svg')[0]);
            $scope.rateCloseup.append('g').append('g').classed('samples', true);
            $scope.rateCloseup.attr('height', $scope.closeUpHeight);

            $scope.shapeCloseup = d3.select(element.find('.shape-closeup svg')[0]);
            $scope.shapeCloseup.append('g').append('g').classed('samples', true);
            $scope.shapeCloseup.attr('height', $scope.closeUpHeight);

            $scope.scaleCloseup = d3.select(element.find('.scale-closeup svg')[0]);
            $scope.scaleCloseup.append('g').append('g').classed('samples', true);
            $scope.scaleCloseup.attr('height', $scope.closeUpHeight);

            $scope.minCloseup = d3.select(element.find('.min-closeup svg')[0]);
            $scope.minCloseup.append('g').append('g').classed('samples', true);
            $scope.minCloseup.attr('height', $scope.closeUpHeight);
            $scope.maxCloseup = d3.select(element.find('.max-closeup svg')[0]);
            $scope.maxCloseup.append('g').append('g').classed('samples', true);
            $scope.maxCloseup.attr('height', $scope.closeUpHeight);

            return true;
          }

          function updateDimensions() {
            $scope.availableSpace.width = element.find('.distribution-plot-container').width();
            $scope.availableSpace.height = element.find('.distribution-plot-container').height();
            $scope.graphWidth = $scope.GRAPH_WIDTH - $scope.MARGIN.left - $scope.MARGIN.right;
            $scope.graphHeight = $scope.GRAPH_HEIGHT - $scope.MARGIN.top - $scope.MARGIN.bottom;
          }

          function render() {
            if (!$scope.svg || !$scope.graphData || !$scope.samplesAvailable) return;

            //get dimensions based on window size
            updateDimensions();

            // d3.select('.generator-distribution').selectAll('.specs').remove();

            //update x and y scales to new dimensions
            $scope.svg.attr('width', $scope.graphWidth + $scope.MARGIN.right + $scope.MARGIN.left)
                .attr('height', $scope.graphHeight + $scope.MARGIN.top + $scope.MARGIN.bottom);
            $scope.chartWrapper.attr('transform', 'translate(' + $scope.MARGIN.left + ',' + $scope.MARGIN.top + ')');
            $scope.x.range([0, $scope.graphWidth]);
            $scope.y.range([$scope.graphHeight, 0]);
            $scope.xAxis.scale($scope.x);
            $scope.yAxis.scale($scope.y);
            $scope.svg.select('.x.axis')
                .attr('transform', 'translate(0,' + $scope.graphHeight + ')')
                .call($scope.xAxis);
            $scope.svg.select('.y.axis')
                .call($scope.yAxis);
            if ($scope.labels) {
              $scope.svg.select('.x.label')
                  .attr('x', $scope.graphWidth / 2 + $scope.MARGIN.left)
                  .attr('y', $scope.graphHeight + $scope.MARGIN.top + 30);
              $scope.svg.select('.y.label')
                  .attr('x', - $scope.graphHeight / 2)
                  .attr('y', 10)
                  .text($scope.labels.y);
            }

            // Change data
            $scope.x.domain(d3.extent($scope.graphData, function (d) { return d.n; }));
            $scope.y.domain([0, d3.max($scope.graphData, function (d) {
              return d.p * ($scope.distribution === 'uniform' ? 2 : 1.5);
            })]);

            $scope.xAxis.scale($scope.x);
            $scope.yAxis.scale($scope.y);

            $scope.line = d3.svg.line()
                .x(function (d) { return $scope.x(d.n); })
                .y(function (d) { return $scope.y(d.p); });

            if ($scope.distribution === 'uniform') {
              $scope.line.interpolate('step-after');
            } else {
              $scope.line.interpolate('cardinal');
            }

            $scope.area = d3.svg.area()
                .x(function (d) { return $scope.x(d.n); })
                .y0(function (d) { return $scope.y(d.pTheory); })
                .y1(function (d) { return $scope.y(d.p); });

            $scope.minMaxArea = d3.svg.area()
                .x(function (d) { return $scope.x(d.n); })
                .y0(function (d) { return $scope.y(d.pMin); })
                .y1(function (d) { return $scope.y(d.pMax); });

            if ($scope.distribution === 'uniform') {
              $scope.area.interpolate('linear');
              $scope.minMaxArea.interpolate('linear');
            } else {
              $scope.area.interpolate('cardinal');
              $scope.minMaxArea.interpolate('cardinal');
            }

            var bins = $scope.histogram.selectAll('rect').data([]);

            bins.exit().transition().remove();
            bins.enter().append('rect')
                .classed('highlighted-histogram', false)
                .classed('theoretical-area', true)
                .style('fill-opacity', '0.7')
                .attr('x', function (d) { return $scope.x(d.n - $scope.distrRangeStep / 2) + 1; })
                .attr('y', function (d) { return $scope.y(d.p); })
                .attr('width', $scope.x($scope.distrRangeStep) - $scope.x(0) - 2)
                .attr('height', function (d) { return Math.abs($scope.y(d.p) - $scope.y(0)); });
            bins.transition()
                .duration(500)
                .style('fill-opacity', '0.7')
                .attr('x', function (d) { return $scope.x(d.n - $scope.distrRangeStep / 2) + 1; })
                .attr('y', function (d) { return $scope.y(d.p); })
                .attr('width', $scope.x($scope.distrRangeStep) - $scope.x(0) - 2)
                .attr('height', function (d) { return Math.abs($scope.y(d.p) - $scope.y(0)); });

            $scope.path
                .classed('theoretical-line', true)
                .transition().duration(750)
                .attr('d', $scope.design === 'histogram' ? null : $scope.line($scope.graphData));

            var expected = [];
            for (var i = 0; i < $scope.graphData.length; i++) expected.push($scope.graphData[i].p);
            for (var i = 0; i < $scope.experimentsNumber; i++) {
              $scope.samples[i].path
                  .classed('hidden-sample', $scope.design !== 'sampleSketches')
                  .transition()
                  .duration(1000)
                  .attr('d', $scope.line($scope.samples[i].data));
            }

            for (var i = 0; i < $scope.experimentsNumber; i++) {
              var data = $scope.samples[i].data;
              if ($scope.distribution === 'uniform') {
                var newData = [];
                for (var j = 0; j < $scope.samples[i].data.length; j++) {
                  var dt = $scope.samples[i].data[j];
                  if (dt.p === 0) continue;
                  if (j === 0) {
                    newData.push({
                      n: $scope.distrRange[0],
                      p: dt.p,
                      pTheory: dt.pTheory
                    });
                  } else if (j === $scope.samples[i].data.length - 1) {
                    newData.push({
                      n: $scope.distrRange[1],
                      p: dt.p,
                      pTheory: dt.pTheory
                    });
                  } else {
                    newData.push(dt);
                  }
                }
                data = newData;
              }
              if ($scope.samples[i].bins) $scope.samples[i].bins.remove();
              $scope.samples[i].area
                  .classed('theoretical-area', true)
                  .transition().duration(1000)
                  .attr('d', $scope.area(data));
            }

            var svgt = $scope.svg.transition();
            svgt.select('.x.axis').call($scope.xAxis);
            svgt.select('.y.axis').call($scope.yAxis);

            drawDistributionSpecificAdditionalInfo();
            $scope.graphVisibility = 'visible';

            addMouseOverInfo();
          }

          function updateBins(data) {
            var xShift = 0;
            if ($scope.distribution !== 'uniform') {
              xShift = - $scope.distrRangeStep / 2;
            }

            var bins = $scope.histogram.selectAll('rect').data(data);
            bins.exit().transition().style('fill-opacity', '0').remove();
            bins.enter().append('rect')
                .classed('highlighted-histogram', true)
                .attr('x', function (d) { return $scope.x(d.n + xShift) + 1; })
                .attr('y', function (d) { return $scope.y(d.p); })
                .attr('width', $scope.x($scope.distrRangeStep) - $scope.x(0) - 2)
                .attr('height', function (d) { return Math.abs($scope.y(d.p) - $scope.y(0)); });
            bins
                .transition()
                .duration(100)
                .style('fill-opacity', null)
                .attr('x', function (d) { return $scope.x(d.n + xShift) + 1; })
                .attr('y', function (d) { return $scope.y(d.p); })
                .attr('width', $scope.x($scope.distrRangeStep) - $scope.x(0) - 2)
                .attr('height', function (d) { return Math.abs($scope.y(d.p) - $scope.y(0)); });
          }

          function highlightSample(id) {
            element.find('.sample').each(function () {
              var el = d3.select(this);
              if (el.attr('exp-id') === id) {
                el.classed('highlighted', true);
              } else {
                el.classed('highlighted', false);
              }
            });
          }

          $scope.removeHistogramTimeout = null;
          function addMouseOverInfo() {
            element
                .off('mouseover')
                .off('mouseout')
                .on('mouseover', '.sample', function () {

                  if ($scope.removeHistogramTimeout) {
                    clearTimeout($scope.removeHistogramTimeout);
                    $scope.removeHistogramTimeout = null;
                  }
                  var id = d3.select(this).attr('exp-id');
                  highlightSample(id);
                  updateBins($scope.samples[id].data);

                })
                .on('mouseout', '.sample', function () {

                  $scope.removeHistogramTimeout = setTimeout(function () {
                    updateBins([]);
                    highlightSample(null);
                  }, 1000);

                });
          }

          function drawDistributionSpecificAdditionalInfo() {
            var distributionPropWidth = $($scope.meanCloseup[0][0]).closest('.distribution-property').width();

            if ($scope.distribution === 'gaussian') {
              element.find('.left-std-dev').removeClass('hidden');
              element.find('.right-std-dev').removeClass('hidden');
              element.find('.mean').removeClass('hidden');

              element.find('.stdev-closeup').removeClass('hidden');
              element.find('.mean-closeup').removeClass('hidden');
              $scope.gStDevLLine = $scope.svg.select('.left-std-dev')
                  .attr('x1', $scope.x($scope.distParameters.mean - $scope.distParameters.stdev))
                  .attr('y1', $scope.y($scope.stdProb))
                  .attr('x2', $scope.x($scope.distParameters.mean - $scope.distParameters.stdev))
                  .attr('y2', $scope.y(0))
                  .classed('theoretical-stdev', true);
              $scope.gStDevRLine = $scope.svg.select('.right-std-dev')
                  .attr('x1', $scope.x($scope.distParameters.mean + $scope.distParameters.stdev))
                  .attr('y1', $scope.y($scope.stdProb))
                  .attr('x2', $scope.x($scope.distParameters.mean + $scope.distParameters.stdev))
                  .attr('y2', $scope.y(0))
                  .classed('theoretical-stdev', true);
              $scope.meanLine = $scope.svg.select('.mean')
                  .attr('x1', $scope.x($scope.distParameters.mean))
                  .attr('y1', $scope.y($scope.meanProb))
                  .attr('x2', $scope.x($scope.distParameters.mean))
                  .attr('y2', $scope.y(0))
                  .classed('theoretical-mean', true);

              // graphing the range of mean
              var meanMin = _.min($scope.samples, 'mean').mean;
              var meanMax = _.max($scope.samples, 'mean').mean;
              var meanCloseupX = d3.scale.linear()
                  .domain([meanMin - 0.1 * (meanMax - meanMin), meanMax + 0.1 * (meanMax - meanMin)])
                  .range([0, distributionPropWidth]);
              var meanAxis = d3.svg.axis().scale(meanCloseupX)
                  .tickValues([meanMin, $scope.distParameters.mean, meanMax])
                  .outerTickSize(0);
              $scope.meanCloseup
                  .attr('width', distributionPropWidth)
                  .select('g')
                  .attr('transform', 'translate(0, 10)')
                  .call(meanAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].mean, sample: true, id: i});
              data.push({x: $scope.distParameters.mean, sample: false, id: -1});
              $scope.meanCloseup.select('.samples').selectAll('line').data([]).exit().remove();
              var rects = $scope.meanCloseup.select('.samples').selectAll('rect').data(data);
              rects.exit().remove();
              rects.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(meanCloseupX($scope.distParameters.mean), meanCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(meanCloseupX(d.x) - meanCloseupX($scope.distParameters.mean)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-mean layered';});
              rects.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(meanCloseupX($scope.distParameters.mean), meanCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(meanCloseupX(d.x) - meanCloseupX($scope.distParameters.mean)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-mean layered';});

              // graphing the range of standard deviation
              var stdMin = _.min($scope.samples, 'stdev').stdev;
              var stdMax = _.max($scope.samples, 'stdev').stdev;
              var stdevCloseupX = d3.scale.linear()
                  .domain([stdMin - 0.1 * (stdMax - stdMin), stdMax + 0.1 * (stdMax - stdMin)])
                  .range([0, distributionPropWidth]);
              var stdAxis = d3.svg.axis().scale(stdevCloseupX)
                  .tickValues([stdMin, $scope.distParameters.stdev, stdMax])
                  .outerTickSize(0);
              $scope.stdevCloseup
                  .attr('width', distributionPropWidth)
                  .select('g')
                  .attr('transform', 'translate(0, 10)')
                  .call(stdAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].stdev, sample: true, id: i});
              data.push({x: $scope.distParameters.stdev, sample: false, id: -1});
              $scope.stdevCloseup.select('.samples').selectAll('line').data([]).exit().remove();

              var rects = $scope.stdevCloseup.select('.samples').selectAll('rect').data(data);
              rects.exit().remove();
              rects.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(stdevCloseupX($scope.distParameters.stdev), stdevCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(stdevCloseupX(d.x) - stdevCloseupX($scope.distParameters.stdev)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-stdev layered';});
              rects.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(stdevCloseupX($scope.distParameters.stdev), stdevCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(stdevCloseupX(d.x) - stdevCloseupX($scope.distParameters.stdev)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-stdev layered';});
            } else {
              element.find('.left-std-dev').addClass('hidden');
              element.find('.right-std-dev').addClass('hidden');
              element.find('.mean').addClass('hidden');
            }

            if ($scope.distribution === 'exponential') {

              element.find('.rate-closeup').removeClass('hidden');

              //graphing the range of rates
              var rateMin = _.min($scope.samples, 'rate').rate;
              var rateMax = _.max($scope.samples, 'rate').rate;
              var rateCloseupX = d3.scale.linear()
                  .domain([rateMin - 0.1 * (rateMax - rateMin), rateMax + 0.1 * (rateMax - rateMin)])
                  .range([0, distributionPropWidth]);
              var rateAxis = d3.svg.axis().scale(rateCloseupX)
                  .tickValues([rateMin, $scope.distParameters.rate, rateMax])
                  .outerTickSize(0);
              $scope.rateCloseup
                  .attr('width', distributionPropWidth)
                  .select('g')
                  .attr('transform', 'translate(' + ($scope.graphWidth * 0.1) + ', 10)')
                  .call(rateAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].rate, sample: true, id: i});
              data.push({x: $scope.distParameters.rate, sample: false, id: -1});
              $scope.rateCloseup.select('.samples').selectAll('line').data([]).exit().remove();
              var rects = $scope.rateCloseup.select('.samples').selectAll('rect').data(data);
              rects.exit().remove();
              rects.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(rateCloseupX($scope.distParameters.rate), rateCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(rateCloseupX(d.x) - rateCloseupX($scope.distParameters.rate)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-rate layered';});
              rects.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(rateCloseupX($scope.distParameters.rate), rateCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(rateCloseupX(d.x) - rateCloseupX($scope.distParameters.rate)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-rate layered';});
            }

            if ($scope.distribution === 'gamma') {

              element.find('.scale-closeup').removeClass('hidden');
              element.find('.shape-closeup').removeClass('hidden');

              //graphing the range of shape
              var shapeMin = _.min($scope.samples, 'shape').shape;
              var shapeMax = _.max($scope.samples, 'shape').shape;
              var shapeCloseupX = d3.scale.linear()
                  .domain([shapeMin - 0.1 * (shapeMax - shapeMin), shapeMax + 0.1 * (shapeMax - shapeMin)])
                  .range([0, distributionPropWidth]);
              var shapeAxis = d3.svg.axis().scale(shapeCloseupX)
                  .tickValues([shapeMin, $scope.distParameters.shape, shapeMax])
                  .outerTickSize(0);
              $scope.shapeCloseup
                  .attr('width', distributionPropWidth)
                  .select('g')
                  .attr('transform', 'translate(' + ($scope.graphWidth * 0.1) + ', 10)')
                  .call(shapeAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].shape, sample: true, id: i});
              data.push({x: $scope.distParameters.shape, sample: false, id: -1});

              $scope.shapeCloseup.select('.samples').selectAll('line').data([]).exit().remove();
              var lines = $scope.shapeCloseup.select('.samples').selectAll('rect').data(data);
              lines.exit().remove();
              lines.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(shapeCloseupX($scope.distParameters.shape), shapeCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(shapeCloseupX(d.x) - shapeCloseupX($scope.distParameters.shape)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-shape layered';});
              lines.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(shapeCloseupX($scope.distParameters.shape), shapeCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(shapeCloseupX(d.x) - shapeCloseupX($scope.distParameters.shape)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-shape layered';});

              // graphing the range of scale
              var scaleMin = _.min($scope.samples, 'scale').scale;
              var scaleMax = _.max($scope.samples, 'scale').scale;
              var scaleCloseupX = d3.scale.linear()
                  .domain([scaleMin - 0.1 * (scaleMax - scaleMin), scaleMax + 0.1 * (scaleMax - scaleMin)])
                  .range([0, $scope.graphWidth * 0.25]);
              var stdAxis = d3.svg.axis().scale(scaleCloseupX)
                  .tickValues([scaleMin, $scope.distParameters.scale, scaleMax])
                  .outerTickSize(0);

              $scope.scaleCloseup
                  .attr('width', distributionPropWidth)
                  .select('g')
                  .attr('transform', 'translate(0, 10)')
                  .call(stdAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].scale, sample: true, id: i});
              data.push({x: $scope.distParameters.scale, sample: false, id: -1});
              $scope.scaleCloseup.select('.samples').selectAll('line').data([]).exit().remove();
              var rects = $scope.scaleCloseup.select('.samples').selectAll('rect').data(data);
              rects.exit().remove();
              rects.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(scaleCloseupX($scope.distParameters.scale), scaleCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(scaleCloseupX(d.x) - scaleCloseupX($scope.distParameters.scale)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-scale layered';});
              rects.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(scaleCloseupX($scope.distParameters.scale), scaleCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(scaleCloseupX(d.x) - scaleCloseupX($scope.distParameters.scale)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-scale layered';});

            }

            if ($scope.distribution === 'uniform') {
              var minMin = _.min($scope.samples, 'min').min;
              var minMax = _.max($scope.samples, 'min').min;
              var minCloseupX = d3.scale.linear()
                  .domain([minMin - 0.1 * (minMax - minMin), minMax + 0.1 * (minMax - minMin)])
                  .range([0, $scope.graphWidth * 0.25]);
              var minAxis = d3.svg.axis().scale(minCloseupX)
                  .tickValues([$scope.distParameters.min, minMax])
                  .outerTickSize(0);
              $scope.minCloseup
                  .attr('width', $scope.graphWidth * 0.4)
                  .select('g')
                  .attr('transform', 'translate(' + ($scope.graphWidth * 0.05) + ', 10)')
                  .call(minAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].min, sample: true, id: i});
              data.push({x: $scope.distParameters.min, sample: false, id: -1});
              $scope.minCloseup.select('.samples').selectAll('line').data([]).exit().remove();
              var rects = $scope.minCloseup.select('.samples').selectAll('rect').data(data);
              rects.exit().remove();
              rects.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(minCloseupX($scope.distParameters.min), minCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(minCloseupX(d.x) - minCloseupX($scope.distParameters.min)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-min layered';});
              rects.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(minCloseupX($scope.distParameters.min), minCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(minCloseupX(d.x) - minCloseupX($scope.distParameters.min)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-min layered';});

              var maxMin = _.min($scope.samples, 'max').max;
              var maxMax = _.max($scope.samples, 'max').max;
              var maxCloseupX = d3.scale.linear()
                  .domain([maxMin - 0.1 * (maxMax - maxMin), maxMax + 0.1 * (maxMax - maxMin)])
                  .range([0, $scope.graphWidth * 0.25]);
              var maxAxis = d3.svg.axis().scale(maxCloseupX)
                  .tickValues([maxMin, $scope.distParameters.max])
                  .outerTickSize(0);
              $scope.maxCloseup
                  .attr('width', $scope.graphWidth * 0.4)
                  .select('g')
                  .attr('transform', 'translate(' + ($scope.graphWidth * 0.05) + ', 10)')
                  .call(maxAxis);
              var data = [];
              for (var i = 0; i < $scope.experimentsNumber; i++) data.push({x: $scope.samples[i].max, sample: true, id: i});
              data.push({x: $scope.distParameters.max, sample: false, id: -1});
              $scope.maxCloseup.select('.samples').selectAll('line').data([]).exit().remove();
              var rects = $scope.maxCloseup.select('.samples').selectAll('rect').data(data);
              rects.exit().remove();
              rects.enter().append('rect')
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(maxCloseupX($scope.distParameters.max), maxCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(maxCloseupX(d.x) - maxCloseupX($scope.distParameters.max)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-max layered';});
              rects.transition()
                  .duration(500)
                  .attr('exp-id', function (d, i) { return i; })
                  .attr('x', function (d) { return Math.min(maxCloseupX($scope.distParameters.max), maxCloseupX(d.x)); })
                  .attr('y', function (d) { return d.sample ? -5 : -7; })
                  .attr('width', function (d) { return d.sample ? Math.abs(maxCloseupX(d.x) - maxCloseupX($scope.distParameters.max)) : 1; })
                  .attr('height', function (d) { return d.sample ? 10 : 14; })
                  .attr('class', function (d) { return d.sample ? 'sample layered' : 'theoretical-max layered';});

              $scope.minLeftCoor = $scope.maxRightCoor = 5;
              $scope.minBottomCoor = $scope.maxBottomCoor = 3;
            }
          }

          // Generate n samples using the distribution in $scope.distrFunctions
          function generateSamples(n, sort) {
            var data = [];
            for (var i = 0; i < n; i++) data.push($scope.distrFunctions.sample());
            if (sort) {
              data.sort(function (p1, p2) {
                return p1 < p2 ? -1 : (p1 > p2 ? 1 : 0);
              });
            }
            return data;
          }

          function updateDistrRange(distrFunctions, distParameters, rangeX) {
            var data, distrRange;
            if (rangeX) {
              distrRange = rangeX;
            } else {
              switch ($scope.distribution) {
                case 'gaussian':
                  distrRange = [
                    distParameters.mean - 3 * distParameters.stdev,
                    distParameters.mean + 3 * distParameters.stdev
                  ];
                  break;
                case 'exponential':
                  data = samplePDFValues(distrFunctions);
                  distrRange = [0, _.max(data, 'n').n];
                  break;
                case 'gamma':
                  data = samplePDFValues(distrFunctions);
                  distrRange = [_.min(data, 'n').n, _.max(data, 'n').n];
                  break;
                case 'uniform':
                  distrRange = [$scope.distParameters.min, $scope.distParameters.max];
              }
            }
            return {
              distrRange: distrRange,
              distrRangeStep: (distrRange[1] - distrRange[0]) / INTERVALS
            }
          }

          // Generating samples this function will return an historgram of the samples
          function generateSampledDistributionData(i) {
            var vals = generateSamples($scope.dataVolume, true);

            var data = [];
            var samplesMean = jStat.mean(vals);
            var samplesStdDev = jStat.stdev(vals);
            var samplesVar = jStat.variance(vals);
            var samplesMin = jStat.min(vals);
            var samplesMax = jStat.max(vals);
            var samplesRate = 1 / samplesMean;
            var samplesScale = samplesVar / samplesMean;
            var samplesShape = samplesMean / samplesScale;

            $scope.samples[i].data = data;
            $scope.samples[i].rawData = vals;
            $scope.samples[i].mean = samplesMean;
            $scope.samples[i].stdev = samplesStdDev;
            $scope.samples[i].min = samplesMin;
            $scope.samples[i].max = samplesMax;
            $scope.samples[i].rate = samplesRate;
            $scope.samples[i].shape = samplesShape;
            $scope.samples[i].scale = samplesScale;

            if ($scope.distribution === 'gaussian') {
              var experimentHistogram = [];
              for (var hist_num = 0; hist_num < INTERVALS; hist_num++) {

                //initialize the actual dataset with a interval elements inside
                data[hist_num] = {
                  n: $scope.distrRange[0] + $scope.distrRangeStep * (hist_num + 0.5),
                  p: 0,
                  pTheory: $scope.graphData[hist_num].p //$scope.graphData's p which is just the theoretical probability
                };

                //keep count of how many points fall into each of the error bucket (1000 falls into 100)
                experimentHistogram[hist_num] = 0;

              }
              //populate and increase histogram count number
              for (var i = 0; i < $scope.dataVolume; i++) {
                var val = vals[i];
                if (val < $scope.distrRange[0] || val > $scope.distrRange[1]) continue;
                var hist_index = Math.floor((val - $scope.distrRange[0]) / (($scope.distrRange[1] - $scope.distrRange[0]) / INTERVALS));
                experimentHistogram[hist_index]++;
              }
              // calculate the prob of that histogram bar
              for (hist_num = 0; hist_num < INTERVALS; hist_num++) {
                data[hist_num].p = experimentHistogram[hist_num];
              }

            } else if ($scope.distribution === 'uniform') {
              var experimentHistogram = [];
              for (var hist_num = 0; hist_num < INTERVALS; hist_num++) {

                //initialize the actual dataset with a interval elements inside
                data[hist_num] = {
                  n: $scope.distParameters.min + $scope.distrRangeStep * (hist_num + 0.5) - $scope.distrRangeStep / 2,
                  p: 0,
                  pTheory: ($scope.dataVolume / INTERVALS)  //$scope.graphData's p which is just the theoretical probability
                };

                //keep count of how many points fall into each of the error bucket (1000 falls into 100)
                experimentHistogram[hist_num] = 0;
              }

              //populate and increase histogram count number
              for (var i = 0; i < $scope.dataVolume; i++) {
                var val = vals[i];
                var hist_index = Math.floor((val - $scope.distParameters.min) / (($scope.distParameters.max - $scope.distParameters.min) / INTERVALS));
                experimentHistogram[hist_index]++;
              }
              // calculate the prob of that histogram bar
              for (hist_num = 0; hist_num < INTERVALS; hist_num++) {
                data[hist_num].p = experimentHistogram[hist_num];
              }

            } else if ($scope.distribution === 'exponential') {
              var experimentHistogram = [];
              for (var hist_num = 0; hist_num < INTERVALS; hist_num++) {

                //initialize the actual dataset with a interval elements inside
                data[hist_num] = {
                  n: $scope.distrRange[0] + $scope.distrRangeStep * (hist_num + 0.5),
                  p: 0,
                  pTheory: $scope.graphData[hist_num].p //$scope.graphData's p which is just the theoretical probability
                };

                //keep count of how many points fall into each of the error bucket (1000 falls into 100)
                experimentHistogram[hist_num] = 0;

              }
              //populate and increase histogram count number
              for (var i = 0; i < $scope.dataVolume; i++) {
                var val = vals[i];
                if (val < $scope.distrRange[0] || val > $scope.distrRange[1]) continue;
                var hist_index = Math.floor((val - $scope.distrRange[0]) / (($scope.distrRange[1] - $scope.distrRange[0]) / INTERVALS));
                experimentHistogram[hist_index]++;
              }
              // calculate the prob of that histogram bar
              for (hist_num = 0; hist_num < INTERVALS; hist_num++) {
                data[hist_num].p = experimentHistogram[hist_num];
              }
            } else if ($scope.distribution === 'gamma') {
              var experimentHistogram = [];
              for (var hist_num = 0; hist_num < INTERVALS; hist_num++) {

                //initialize the actual dataset with a interval elements inside
                data[hist_num] = {
                  n: $scope.distrRange[0] + $scope.distrRangeStep * (hist_num + 0.5),
                  p: 0,
                  pTheory: $scope.graphData[hist_num].p //$scope.graphData's p which is just the theoretical probability
                };

                //keep count of how many points fall into each of the error bucket (1000 falls into 100)
                experimentHistogram[hist_num] = 0;
              }

              //populate and increase histogram count number
              for (var i = 0; i < $scope.dataVolume; i++) {
                var val = vals[i];
                if (val < $scope.distrRange[0] || val > $scope.distrRange[1]) continue;
                var hist_index = Math.floor((val - $scope.distrRange[0]) / (($scope.distrRange[1] - $scope.distrRange[0]) / INTERVALS));
                experimentHistogram[hist_index]++;
              }

              // calculate the prob of that histogram bar
              for (hist_num = 0; hist_num < INTERVALS; hist_num++) {
                experimentHistogram[hist_num] /= vals.length;
                data[hist_num].p = experimentHistogram[hist_num];
              }
            }

            return data;
          }

          // Generate theoretical pdf values
          function samplePDFValues(distrFunctions) {
            var n, p, data = [];
            for (var i = 0; i < $scope.dataVolume; i++) {
              n = distrFunctions.sample();
              p = distrFunctions.pdf(n);
              data.push({n: n, p: p})
            }
            data.sort(function (p1, p2) {
              return p1.n < p2.n ? -1 : (p1.n > p2.n ? 1 : 0);
            });
            return data;
          }

          function buildDistrFunctions(distribution, distParameters) {
            switch (distribution) {
              case 'gaussian':
                return {
                  distribution: jStat.normal,
                  sample: function () { return jStat.normal.sample(distParameters.mean, distParameters.stdev); },
                  pdf: function (n) { return jStat.normal.pdf(n, distParameters.mean, distParameters.stdev); },
                  cdf: function (n) { return jStat.normal.cdf(n, distParameters.mean, distParameters.stdev); }
                };
              case 'exponential':
                return {
                  distribution: jStat.exponential,
                  sample: function () { return jStat.exponential.sample(distParameters.rate); },
                  pdf: function (n) { return jStat.exponential.pdf(n, distParameters.rate); },
                  cdf: function (n) { return jStat.exponential.cdf(n, distParameters.rate); }
                };
              case 'gamma':
                return {
                  distribution: jStat.gamma,
                  sample: function () { return jStat.gamma.sample(distParameters.shape, distParameters.scale); },
                  pdf: function (n) { return jStat.gamma.pdf(n, distParameters.shape, distParameters.scale); },
                  cdf: function (n) { return jStat.gamma.cdf(n, distParameters.shape, distParameters.scale); }
                };
              case 'uniform':
                return {
                  distribution: jStat.uniform,
                  sample: function () { return jStat.uniform.sample(distParameters.min, distParameters.max); },
                  pdf: function (n) { return jStat.uniform.pdf(n, distParameters.min, distParameters.max); },
                  cdf: function (n) { return jStat.uniform.cdf(n, distParameters.min, distParameters.max); }
                };
            }
          }

          function generateTheoreticalDistributionData(distribution, distrFunctions, distrRange, distrRangeStep, distParameters) {
            var data = [], parametersProbs = {};
            switch (distribution) {
              case 'gaussian':
                for (var i = 0; i < INTERVALS; i++) {
                  var distrVal = distrFunctions.cdf(distrRange[0] + distrRangeStep * (i + 1)) -
                      distrFunctions.cdf(distrRange[0] + distrRangeStep * i);
                  distrVal *= $scope.dataVolume; // to frequencies instead of probability

                  if (((distrRange[0] + distrRangeStep * INTERVALS / 2 - distParameters.stdev) >
                          (distrRange[0] + distrRangeStep * i)) &&
                      ((distrRange[0] + distrRangeStep * INTERVALS / 2 - distParameters.stdev) <
                          (distrRange[0] + distrRangeStep * (i + 1)))) {
                    parametersProbs.stdProb = distrVal;
                  }
                  data.push({n: distrRange[0] + distrRangeStep * (i + 0.5), p: distrVal});
                }
                parametersProbs.meanProb = data[INTERVALS / 2].p;
                break;
              case 'exponential':
                for (var i = 0; i < INTERVALS; i++) {
                  var distrVal = distrFunctions.cdf(distrRange[0] + distrRangeStep * (i + 1)) -
                      distrFunctions.cdf(distrRange[0] + distrRangeStep * i);
                  distrVal *= $scope.dataVolume; // to frequencies instead of probability
                  data.push({n: distrRange[0] + distrRangeStep * (i + 0.5), p: distrVal});
                }
                break;
              case 'gamma':
                for (var i = 0; i < INTERVALS; i++) {
                  var distrVal = distrFunctions.cdf(distrRange[0] + distrRangeStep * (i + 1)) -
                      distrFunctions.cdf(distrRange[0] + distrRangeStep * i);
                  distrVal *= $scope.dataVolume; // to frequencies instead of probability
                  data.push({n: distrRange[0] + distrRangeStep * (i + 0.5), p: distrVal});
                }
                break;
              case 'uniform':
                for (var i = -2; i < INTERVALS + 3; i++) {
                  data.push({
                    n: distParameters.min + distrRangeStep * i,
                    p: (i >= 0 && i < INTERVALS) ? ($scope.dataVolume / INTERVALS) : 0
                  });
                }
            }

            return {
              data: data,
              parametersProbs: parametersProbs
            };
          }

          function updateParametersProbs(distribution, parametersProbs) {
            switch (distribution) {
              case 'gaussian':
                $scope.stdProb = parametersProbs.stdProb;
                $scope.meanProb = parametersProbs.meanProb;
                break;
            }
          }

          $scope.$watch(function () {
            return [$scope.distribution, $scope.distParameters, $scope.enabled, Model.dataVolume, Model.experimentsNumber];
          }, function () {
            if ($scope.enabled === false) return;

            if (!$scope.graphData) {
              updateResult();
              return;
            }

            if ($scope.dataGenerationReqTimeout !== null) {
              $timeout.cancel($scope.dataGenerationReqTimeout);
            }

            $scope.dataGenerationReqTimeout = $timeout(function () {
              updateResult();
              $scope.dataGenerationReqTimeout = null;
            }, 700);

          }, true);
          $scope.$watch('compactView', function () { $timeout(render); });
          $scope.$watch('_result', function () {
            $scope.inputRead = false;
            readResult();
          }, true);
          $rootScope.$on('windowResize', function () {
            $timeout(render);
          });
        }
      };
    }]);

