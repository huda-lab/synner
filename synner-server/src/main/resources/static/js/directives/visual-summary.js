angular.module('Synner')
    .directive('visualSummary', ['$rootScope', '$timeout', 'Model', 'Parameters', function ($rootScope, $timeout, Model, Parameters) {
      return {
        templateUrl: 'fragments/visual-summary.html',
        replace: true,
        restriction: 'E',
        scope: {
          field: '='
        },
        link: function ($scope, element, attrs) {
          $scope.HIST_BARS = 20;
          $scope.MAX_STR_HIST_SIZE = 60;

          function updateResult() {
            updateGraphSummary();
            updateSummary();
          }

          function numericalValue(val, type) {
            if (type === 'date') {
              return Model.getIntFromDate(val);
            } else if (type === 'time') {
              return Model.getIntFromTime(val);
            } else if (type === 'string') {
              return parseFloat(val);
            } else {
              return val;
            }
          }

          function updateSummary() {

            var values = [];
            for (var j = 0; j < Model.data.length; j++) {
              var val = Model.data[j][$scope.field.id];
              if (val === null) continue;
              values.push(numericalValue(val.v, $scope.field.type));
            }

            $scope.textSummary = ' ';
            if ($scope.field.type === 'decimal' || $scope.field.type === 'integer') {
              if (values.length === 0) return;
              var mean = jStat.mean(values);
              var stdv = jStat.stdev(values);
              if (mean && stdv) {
                $scope.textSummary = 'Mean: ' + mean.toFixed(2) + ', Stdev: ' + stdv.toFixed(2);
              }
            }
          }

          function initHistogram() {
            $scope.svg = d3.select(element.find('svg')[0]);
            $scope.hist = $scope.svg.append('g');
            updateHistogram();
          }

          function updateHistogram() {
            $scope.histogramWidth = $scope.svg.node().getBoundingClientRect().width;
            $scope.histogramHeight = $scope.svg.node().getBoundingClientRect().height;
            $scope.barWidth = $scope.histogramWidth / $scope.values.length;
            $scope.x = d3.scale.ordinal()
                .domain($scope.values.map(function (d) { return d.id; }))
                .rangeBands([0, $scope.histogramWidth], 0, 0);
            $scope.y = d3.scale.linear()
                .range([$scope.histogramHeight, 0])
                .domain([0, d3.max($scope.values, function (d) { return d.freq; })]);
          }

          function calculateFrequencies() {
            $scope.values = [];
            var valNum = 0, j, val;
            var missingVals = 0, errorVals = 0;

            if ($scope.field.type === 'string') {
              $scope.strMap = new Map();
              var dataSize = Math.min($scope.MAX_STR_HIST_SIZE, Model.data.length);
              for (j = 0; j < dataSize; j++) {
                val = Model.data[j][$scope.field.id];
                valNum++;
                if (val === null || val.v === null) {
                  missingVals++;
                  continue;
                } else if (val.s === 'error') {
                  errorVals++;
                  continue;
                }
                var num = $scope.strMap.get(val.v);
                $scope.strMap.set(val.v, num === undefined ? 1 : num + 1);
              }
              var i = 0;
              $scope.labels = Array.from($scope.strMap.keys()).sort();
              for (var k of $scope.labels) {
                $scope.values.push({id: i, freq: valNum === 0 ? 0 : $scope.strMap.get(k) / valNum, s: null});
                i++;
              }
              if (missingVals > 0) {
                $scope.values.push({
                  id: i++,
                  freq: valNum === 0 ? 0 : missingVals / valNum,
                  s: 'missing'
                });
              }
              if (errorVals > 0) {
                $scope.values.push({
                  id: i,
                  freq: valNum === 0 ? 0 : errorVals / valNum,
                  s: 'error'
                });
              }
            } else {
              var max = _.max(Model.data, function (r) { return r[$scope.field.id] === null ? null : r[$scope.field.id].v; });
              if (max[$scope.field.id] == null) return; else max = numericalValue(max[$scope.field.id].v, $scope.field.type);
              var min = _.min(Model.data, function (r) { return r[$scope.field.id] === null ? null : r[$scope.field.id].v; });
              if (min[$scope.field.id] == null) return; else min = numericalValue(min[$scope.field.id].v, $scope.field.type);

              var hist_bars = $scope.HIST_BARS;
              if ($scope.field.type === 'integer' && max - min + 1 < $scope.HIST_BARS) {
                hist_bars = max - min + 1;
              }
              for (j = 0; j < hist_bars; j++)
                $scope.values[j] = {
                  id: j,
                  freq: 0,
                  bucketMin: min + (max - min) / hist_bars * j,
                  bucketMax: min + (max - min) / hist_bars * (j + 1)
                };
              for (j = 0; j < Model.data.length; j++) {
                val = Model.data[j][$scope.field.id];
                if (!val || val.v === null) continue;
                valNum++;
                var val = $scope.values[Math.floor(
                        ((numericalValue(val.v, $scope.field.type) - min) / (max - min)) * (hist_bars - 1)
                    )];
                if (val) val.freq++;
              }
              if (valNum > 0) {
                for (j = 0; j < hist_bars; j++) $scope.values[j].freq /= valNum;
              }
            }
          }

          function updateGraphSummary() {
            calculateFrequencies();
            if ($scope.values.length === 0) return;
            if (!$scope.svg) { initHistogram(); } else { updateHistogram(); }
            var bar = $scope.hist.selectAll('.bar').data($scope.values);
            bar.enter().append('rect');
            bar.exit().remove();
            bar.attr('class', 'bar')
                .classed('missing', function (d) {
                  return d.s === 'missing'
                })
                .classed('error', function (d) {
                  return d.s === 'error'
                })
                .transition()
                .duration(1000)
                .attr('x', function (d) { return $scope.x(d.id); })
                .attr('y', function (d) { return $scope.y(d.freq); })
                .attr('width', $scope.x.rangeBand())
                .attr('height', function (d) { return $scope.histogramHeight - $scope.y(d.freq); });

            element.find('.visual-summary-tootip').remove();
            var tooltip = d3.select('.visual-summary')
                .append('div')
                .attr('class', 'visual-summary-tootip')
                .style('position', 'absolute')
                .style('z-index', '10')
                .style('font-size', '12px')
                .style('font-weight', 'normal')
                .style('background', '#ddd')
                .style('padding', '4px')
                .style('visibility', 'hidden');

            bar.on('mouseover', function (d, i) {
              var text;
              var freq = Math.round(d.freq * Model.data.length);
              if ($scope.values[i].s === 'missing') {
                text = 'Missing';
              } else if ($scope.values[i].s === 'error') {
                text = 'Error';
              } else if ($scope.field.type === 'string') {
                text = $scope.labels[d.id];
              } else {
                var minBar = $scope.values[i].bucketMin;
                var maxBar = $scope.values[i].bucketMax;
                if ($scope.field.type === 'decimal' && minBar && maxBar) {
                  text = minBar.toPrecision(3) + ' to ' + maxBar.toPrecision(3);
                } else if ($scope.field.type === 'integer') {
                  text = Math.round(minBar) + ' to ' + Math.round(maxBar);
                } else if ($scope.field.type === 'time') {
                  text = Model.strFormatTimeFromTime(Model.getTimeFromInt(minBar)) + ' to ' +
                         Model.strFormatTimeFromTime(Model.getTimeFromInt(maxBar));
                } else if ($scope.field.type === 'date') {
                  text = Model.strFormatDateFromDate(Model.getDateFromInt(minBar)) + ' to ' +
                         Model.strFormatDateFromDate(Model.getDateFromInt(maxBar));
                }
              }
              return tooltip
                  .html('<strong>' + text + '</strong>' + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(' + Math.round(d.freq * 100) + '%)')
                  .style('top', (d3.event.pageY - 80) + 'px')
                  .style('left', (d3.event.pageX + 10) + 'px')
                  .style('visibility', 'visible');
            }).on('mouseleave', function () {
              return tooltip.style('visibility', 'hidden');
            });
          }

          $scope.$watch(function () {
            var values = [];
            for (var f of Model.data) {
              values.push(f[$scope.field.id]);
            }
            return values;
          }, updateResult, true);
        }
      };
    }]);
