(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-dispatch'), require('d3-scale'), require('d3-format'), require('d3-array')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3-dispatch', 'd3-scale', 'd3-format', 'd3-array'], factory) :
  (factory((global.indexRollup = global.indexRollup || {}),global.d3Dispatch,global.d3Scale,global.d3Format,global.d3Array));
}(this, function (exports,d3Dispatch,d3Scale,d3Format,d3Array) { 'use strict';

  var helper = {

    d3_identity: function d3_identity(d) {
      return d;
    },

    d3_mergeLabels: function d3_mergeLabels(gen, labels) {

      if (labels.length === 0) return gen;

      gen = gen ? gen : [];

      var i = labels.length;
      for (; i < gen.length; i++) {
        labels.push(gen[i]);
      }
      return labels;
    },

    d3_linearLegend: function d3_linearLegend(scale, cells, labelFormat) {
      var data = [];

      if (cells.length > 1) {
        data = cells;
      } else {
        var domain = scale.domain(),
            increment = (domain[domain.length - 1] - domain[0]) / (cells - 1),
            i = 0;

        for (; i < cells; i++) {
          data.push(domain[0] + i * increment);
        }
      }

      var labels = data.map(labelFormat);

      return { data: data,
        labels: labels,
        feature: function feature(d) {
          return scale(d);
        } };
    },

    d3_quantLegend: function d3_quantLegend(scale, labelFormat, labelDelimiter) {
      var labels = scale.range().map(function (d) {
        var invert = scale.invertExtent(d),
            a = labelFormat(invert[0]),
            b = labelFormat(invert[1]);

        return labelFormat(invert[0]) + " " + labelDelimiter + " " + labelFormat(invert[1]);
      });

      return { data: scale.range(),
        labels: labels,
        feature: this.d3_identity
      };
    },

    d3_ordinalLegend: function d3_ordinalLegend(scale) {
      return { data: scale.domain(),
        labels: scale.domain(),
        feature: function feature(d) {
          return scale(d);
        } };
    },

    d3_drawShapes: function d3_drawShapes(shape, shapes, shapeHeight, shapeWidth, shapeRadius, path) {
      if (shape === "rect") {
        shapes.attr("height", shapeHeight).attr("width", shapeWidth);
      } else if (shape === "circle") {
        shapes.attr("r", shapeRadius); //.attr("cx", shapeRadius).attr("cy", shapeRadius);
      } else if (shape === "line") {
        shapes.attr("x1", 0).attr("x2", shapeWidth).attr("y1", 0).attr("y2", 0);
      } else if (shape === "path") {
        shapes.attr("d", path);
      }
    },

    d3_addText: function d3_addText(svg, enter, labels, classPrefix) {
      enter.append("text").attr("class", classPrefix + "label");
      svg.selectAll("g." + classPrefix + "cell text").data(labels).text(this.d3_identity);
    },

    d3_calcType: function d3_calcType(scale, ascending, cells, labels, labelFormat, labelDelimiter) {
      var type = scale.invertExtent ? this.d3_quantLegend(scale, labelFormat, labelDelimiter) : scale.ticks ? this.d3_linearLegend(scale, cells, labelFormat) : this.d3_ordinalLegend(scale);

      type.labels = this.d3_mergeLabels(type.labels, labels);

      if (ascending) {
        type.labels = this.d3_reverse(type.labels);
        type.data = this.d3_reverse(type.data);
      }

      return type;
    },

    d3_reverse: function d3_reverse(arr) {
      var mirror = [];
      for (var i = 0, l = arr.length; i < l; i++) {
        mirror[i] = arr[l - i - 1];
      }
      return mirror;
    },

    d3_placement: function d3_placement(orient, cell, cellTrans, text, textTrans, labelAlign) {
      cell.attr("transform", cellTrans);
      text.attr("transform", textTrans);
      if (orient === "horizontal") {
        text.style("text-anchor", labelAlign);
      }
    },

    d3_addEvents: function d3_addEvents(cells, dispatcher) {
      var _ = this;

      cells.on("mouseover.legend", function (d) {
        _.d3_cellOver(dispatcher, d, this);
      }).on("mouseout.legend", function (d) {
        _.d3_cellOut(dispatcher, d, this);
      }).on("click.legend", function (d) {
        _.d3_cellClick(dispatcher, d, this);
      });
    },

    d3_cellOver: function d3_cellOver(cellDispatcher, d, obj) {
      cellDispatcher.call("cellover", obj, d);
    },

    d3_cellOut: function d3_cellOut(cellDispatcher, d, obj) {
      cellDispatcher.call("cellout", obj, d);
    },

    d3_cellClick: function d3_cellClick(cellDispatcher, d, obj) {
      cellDispatcher.call("cellclick", obj, d);
    },

    d3_title: function d3_title(svg, title, classPrefix) {
      if (title !== "") {

        var titleText = svg.selectAll('text.' + classPrefix + 'legendTitle');

        titleText.data([title]).enter().append('text').attr('class', classPrefix + 'legendTitle');

        svg.selectAll('text.' + classPrefix + 'legendTitle').text(title);

        var cellsSvg = svg.select('.' + classPrefix + 'legendCells');

        var yOffset = svg.select('.' + classPrefix + 'legendTitle').nodes().map(function (d) {
          return d.getBBox().height;
        })[0],
            xOffset = -cellsSvg.nodes().map(function (d) {
          return d.getBBox().x;
        })[0];

        cellsSvg.attr('transform', 'translate(' + xOffset + ',' + (yOffset + 10) + ')');
      }
    }
  };

  function color() {

    var scale = d3Scale.scaleLinear(),
        shape = "rect",
        shapeWidth = 15,
        shapeHeight = 15,
        shapeRadius = 10,
        shapePadding = 2,
        cells = [5],
        labels = [],
        classPrefix = "",
        useClass = false,
        title = "",
        labelFormat = d3Format.format(".01f"),
        labelOffset = 10,
        labelAlign = "middle",
        labelDelimiter = "to",
        orient = "vertical",
        ascending = false,
        path,
        legendDispatcher = d3Dispatch.dispatch("cellover", "cellout", "cellclick");

    function legend(svg) {

      var type = helper.d3_calcType(scale, ascending, cells, labels, labelFormat, labelDelimiter),
          legendG = svg.selectAll('g').data([scale]);

      legendG.enter().append('g').attr('class', classPrefix + 'legendCells');

      var cell = svg.select('.' + classPrefix + 'legendCells').selectAll("." + classPrefix + "cell").data(type.data),
          cellEnter = cell.enter().append("g").attr("class", classPrefix + "cell"),
          //.merge(cell).style("opacity", 1e-6),
      shapeEnter = cellEnter.append(shape).attr("class", classPrefix + "swatch"),
          shapes = svg.selectAll("g." + classPrefix + "cell " + shape);

      //add event handlers
      helper.d3_addEvents(cellEnter, legendDispatcher);

      cell.exit().transition().style("opacity", 0).remove();

      helper.d3_drawShapes(shape, shapes, shapeHeight, shapeWidth, shapeRadius, path);

      helper.d3_addText(svg, cellEnter, type.labels, classPrefix);

      // sets placement
      var text = cellEnter.selectAll("text"),
          shapeSize = shapes.nodes().map(function (d) {
        return d.getBBox();
      });

      //sets scale
      //everything is fill except for line which is stroke,
      if (!useClass) {
        if (shape == "line") {
          shapes.style("stroke", type.feature);
        } else {
          shapes.style("fill", type.feature);
        }
      } else {
        shapes.attr("class", function (d) {
          return classPrefix + "swatch " + type.feature(d);
        });
      }

      var cellTrans,
          textTrans,
          textAlign = labelAlign == "start" ? 0 : labelAlign == "middle" ? 0.5 : 1;

      //positions cells and text
      if (orient === "vertical") {
        cellTrans = function cellTrans(d, i) {
          return "translate(0, " + i * (shapeSize[i].height + shapePadding) + ")";
        };
        textTrans = function textTrans(d, i) {
          return "translate(" + (shapeSize[i].width + shapeSize[i].x + labelOffset) + "," + (shapeSize[i].y + shapeSize[i].height / 2 + 5) + ")";
        };
      } else if (orient === "horizontal") {
        cellTrans = function cellTrans(d, i) {
          return "translate(" + i * (shapeSize[i].width + shapePadding) + ",0)";
        };
        textTrans = function textTrans(d, i) {
          return "translate(" + (shapeSize[i].width * textAlign + shapeSize[i].x) + "," + (shapeSize[i].height + shapeSize[i].y + labelOffset + 8) + ")";
        };
      }

      helper.d3_placement(orient, cellEnter, cellTrans, text, textTrans, labelAlign);
      helper.d3_title(svg, title, classPrefix);

      cell.transition().style("opacity", 1);
    }

    legend.scale = function (_) {
      if (!arguments.length) return scale;
      scale = _;
      return legend;
    };

    legend.cells = function (_) {
      if (!arguments.length) return cells;
      if (_.length > 1 || _ >= 2) {
        cells = _;
      }
      return legend;
    };

    legend.shape = function (_, d) {
      if (!arguments.length) return shape;
      if (_ == "rect" || _ == "circle" || _ == "line" || _ == "path" && typeof d === 'string') {
        shape = _;
        path = d;
      }
      return legend;
    };

    legend.shapeWidth = function (_) {
      if (!arguments.length) return shapeWidth;
      shapeWidth = +_;
      return legend;
    };

    legend.shapeHeight = function (_) {
      if (!arguments.length) return shapeHeight;
      shapeHeight = +_;
      return legend;
    };

    legend.shapeRadius = function (_) {
      if (!arguments.length) return shapeRadius;
      shapeRadius = +_;
      return legend;
    };

    legend.shapePadding = function (_) {
      if (!arguments.length) return shapePadding;
      shapePadding = +_;
      return legend;
    };

    legend.labels = function (_) {
      if (!arguments.length) return labels;
      labels = _;
      return legend;
    };

    legend.labelAlign = function (_) {
      if (!arguments.length) return labelAlign;
      if (_ == "start" || _ == "end" || _ == "middle") {
        labelAlign = _;
      }
      return legend;
    };

    legend.labelFormat = function (_) {
      if (!arguments.length) return labelFormat;
      labelFormat = _;
      return legend;
    };

    legend.labelOffset = function (_) {
      if (!arguments.length) return labelOffset;
      labelOffset = +_;
      return legend;
    };

    legend.labelDelimiter = function (_) {
      if (!arguments.length) return labelDelimiter;
      labelDelimiter = _;
      return legend;
    };

    legend.useClass = function (_) {
      if (!arguments.length) return useClass;
      if (_ === true || _ === false) {
        useClass = _;
      }
      return legend;
    };

    legend.orient = function (_) {
      if (!arguments.length) return orient;
      _ = _.toLowerCase();
      if (_ == "horizontal" || _ == "vertical") {
        orient = _;
      }
      return legend;
    };

    legend.ascending = function (_) {
      if (!arguments.length) return ascending;
      ascending = !!_;
      return legend;
    };

    legend.classPrefix = function (_) {
      if (!arguments.length) return classPrefix;
      classPrefix = _;
      return legend;
    };

    legend.title = function (_) {
      if (!arguments.length) return title;
      title = _;
      return legend;
    };

    legend.on = function () {
      var value = legendDispatcher.on.apply(legendDispatcher, arguments);
      return value === legendDispatcher ? legend : value;
    };

    return legend;
  };

  function size() {

    var scale = d3Scale.scaleLinear(),
        shape = "rect",
        shapeWidth = 15,
        shapePadding = 2,
        cells = [5],
        labels = [],
        useStroke = false,
        classPrefix = "",
        title = "",
        labelFormat = d3Format.format(".01f"),
        labelOffset = 10,
        labelAlign = "middle",
        labelDelimiter = "to",
        orient = "vertical",
        ascending = false,
        path,
        legendDispatcher = d3Dispatch.dispatch("cellover", "cellout", "cellclick");

    function legend(svg) {

      var type = helper.d3_calcType(scale, ascending, cells, labels, labelFormat, labelDelimiter),
          legendG = svg.selectAll('g').data([scale]);

      legendG.enter().append('g').attr('class', classPrefix + 'legendCells');

      var cell = svg.select('.' + classPrefix + 'legendCells').selectAll("." + classPrefix + "cell").data(type.data),
          cellEnter = cell.enter().append("g").attr("class", classPrefix + "cell"),
          //.merge(cell).style("opacity", 1e-6),
      shapeEnter = cellEnter.append(shape).attr("class", classPrefix + "swatch"),
          shapes = svg.selectAll("g." + classPrefix + "cell " + shape);

      //add event handlers
      helper.d3_addEvents(cellEnter, legendDispatcher);

      cell.exit().transition().style("opacity", 0).remove();

      //creates shape
      if (shape === "line") {
        helper.d3_drawShapes(shape, shapes, 0, shapeWidth);
        shapes.attr("stroke-width", type.feature);
      } else {
        helper.d3_drawShapes(shape, shapes, type.feature, type.feature, type.feature, path);
      }

      helper.d3_addText(svg, cellEnter, type.labels, classPrefix);

      //sets placement
      var text = cellEnter.selectAll("text"),
          shapeSize = shapes.nodes().map(function (d, i) {
        var bbox = d.getBBox();
        var stroke = scale(type.data[i]);

        if (shape === "line" && orient === "horizontal") {
          bbox.height = bbox.height + stroke;
        } else if (shape === "line" && orient === "vertical") {
          bbox.width = bbox.width;
        }

        return bbox;
      });

      var maxH = d3Array.max(shapeSize, function (d) {
        return d.height + d.y;
      }),
          maxW = d3Array.max(shapeSize, function (d) {
        return d.width + d.x;
      });

      var cellTrans,
          textTrans,
          textAlign = labelAlign == "start" ? 0 : labelAlign == "middle" ? 0.5 : 1;

      //positions cells and text
      if (orient === "vertical") {

        cellTrans = function cellTrans(d, i) {
          var height = d3Array.sum(shapeSize.slice(0, i + 1), function (d) {
            return d.height;
          });
          return "translate(0, " + (height + i * shapePadding) + ")";
        };

        textTrans = function textTrans(d, i) {
          return "translate(" + (maxW + labelOffset) + "," + (shapeSize[i].y + shapeSize[i].height / 2 + 5) + ")";
        };
      } else if (orient === "horizontal") {
        cellTrans = function cellTrans(d, i) {
          var width = d3Array.sum(shapeSize.slice(0, i + 1), function (d) {
            return d.width;
          });
          return "translate(" + (width + i * shapePadding) + ",0)";
        };

        textTrans = function textTrans(d, i) {
          return "translate(" + (shapeSize[i].width * textAlign + shapeSize[i].x) + "," + (maxH + labelOffset) + ")";
        };
      }

      helper.d3_placement(orient, cellEnter, cellTrans, text, textTrans, labelAlign);
      helper.d3_title(svg, title, classPrefix);

      cell.transition().style("opacity", 1);
    }

    legend.scale = function (_) {
      if (!arguments.length) return scale;
      scale = _;
      return legend;
    };

    legend.cells = function (_) {
      if (!arguments.length) return cells;
      if (_.length > 1 || _ >= 2) {
        cells = _;
      }
      return legend;
    };

    legend.shape = function (_, d) {
      if (!arguments.length) return shape;
      if (_ == "rect" || _ == "circle" || _ == "line") {
        shape = _;
        path = d;
      }
      return legend;
    };

    legend.shapeWidth = function (_) {
      if (!arguments.length) return shapeWidth;
      shapeWidth = +_;
      return legend;
    };

    legend.shapePadding = function (_) {
      if (!arguments.length) return shapePadding;
      shapePadding = +_;
      return legend;
    };

    legend.labels = function (_) {
      if (!arguments.length) return labels;
      labels = _;
      return legend;
    };

    legend.labelAlign = function (_) {
      if (!arguments.length) return labelAlign;
      if (_ == "start" || _ == "end" || _ == "middle") {
        labelAlign = _;
      }
      return legend;
    };

    legend.labelFormat = function (_) {
      if (!arguments.length) return labelFormat;
      labelFormat = _;
      return legend;
    };

    legend.labelOffset = function (_) {
      if (!arguments.length) return labelOffset;
      labelOffset = +_;
      return legend;
    };

    legend.labelDelimiter = function (_) {
      if (!arguments.length) return labelDelimiter;
      labelDelimiter = _;
      return legend;
    };

    legend.orient = function (_) {
      if (!arguments.length) return orient;
      _ = _.toLowerCase();
      if (_ == "horizontal" || _ == "vertical") {
        orient = _;
      }
      return legend;
    };

    legend.ascending = function (_) {
      if (!arguments.length) return ascending;
      ascending = !!_;
      return legend;
    };

    legend.classPrefix = function (_) {
      if (!arguments.length) return classPrefix;
      classPrefix = _;
      return legend;
    };

    legend.title = function (_) {
      if (!arguments.length) return title;
      title = _;
      return legend;
    };

    legend.on = function () {
      var value = legendDispatcher.on.apply(legendDispatcher, arguments);
      return value === legendDispatcher ? legend : value;
    };

    return legend;
  };

  function symbol() {

    var scale = d3Scale.scaleLinear(),
        shape = "path",
        shapeWidth = 15,
        shapeHeight = 15,
        shapeRadius = 10,
        shapePadding = 5,
        cells = [5],
        labels = [],
        classPrefix = "",
        useClass = false,
        title = "",
        labelFormat = d3Format.format(".01f"),
        labelAlign = "middle",
        labelOffset = 10,
        labelDelimiter = "to",
        orient = "vertical",
        ascending = false,
        legendDispatcher = d3Dispatch.dispatch("cellover", "cellout", "cellclick");

    function legend(svg) {

      var type = helper.d3_calcType(scale, ascending, cells, labels, labelFormat, labelDelimiter),
          legendG = svg.selectAll('g').data([scale]);

      legendG.enter().append('g').attr('class', classPrefix + 'legendCells');

      var cell = svg.select('.' + classPrefix + 'legendCells').selectAll("." + classPrefix + "cell").data(type.data),
          cellEnter = cell.enter().append("g").attr("class", classPrefix + "cell"),
          //.style("opacity", 1e-6),
      shapeEnter = cellEnter.append(shape).attr("class", classPrefix + "swatch"),
          shapes = svg.selectAll("g." + classPrefix + "cell " + shape);

      //add event handlers
      helper.d3_addEvents(cellEnter, legendDispatcher);

      //remove old shapes
      cell.exit().transition().style("opacity", 0).remove();

      helper.d3_drawShapes(shape, shapes, shapeHeight, shapeWidth, shapeRadius, type.feature);
      helper.d3_addText(svg, cellEnter, type.labels, classPrefix);

      // sets placement
      var text = cellEnter.selectAll("text"),
          shapeSize = shapes.nodes().map(function (d) {
        return d.getBBox();
      });

      var maxH = d3Array.max(shapeSize, function (d) {
        return d.height;
      }),
          maxW = d3Array.max(shapeSize, function (d) {
        return d.width;
      });

      var cellTrans,
          textTrans,
          textAlign = labelAlign == "start" ? 0 : labelAlign == "middle" ? 0.5 : 1;

      //positions cells and text
      if (orient === "vertical") {
        cellTrans = function cellTrans(d, i) {
          return "translate(0, " + i * (maxH + shapePadding) + ")";
        };
        textTrans = function textTrans(d, i) {
          return "translate(" + (maxW + labelOffset) + "," + (shapeSize[i].y + shapeSize[i].height / 2 + 5) + ")";
        };
      } else if (orient === "horizontal") {
        cellTrans = function cellTrans(d, i) {
          return "translate(" + i * (maxW + shapePadding) + ",0)";
        };
        textTrans = function textTrans(d, i) {
          return "translate(" + (shapeSize[i].width * textAlign + shapeSize[i].x) + "," + (maxH + labelOffset) + ")";
        };
      }

      helper.d3_placement(orient, cellEnter, cellTrans, text, textTrans, labelAlign);
      helper.d3_title(svg, title, classPrefix);
      cell.transition().style("opacity", 1);
    }

    legend.scale = function (_) {
      if (!arguments.length) return scale;
      scale = _;
      return legend;
    };

    legend.cells = function (_) {
      if (!arguments.length) return cells;
      if (_.length > 1 || _ >= 2) {
        cells = _;
      }
      return legend;
    };

    legend.shapePadding = function (_) {
      if (!arguments.length) return shapePadding;
      shapePadding = +_;
      return legend;
    };

    legend.labels = function (_) {
      if (!arguments.length) return labels;
      labels = _;
      return legend;
    };

    legend.labelAlign = function (_) {
      if (!arguments.length) return labelAlign;
      if (_ == "start" || _ == "end" || _ == "middle") {
        labelAlign = _;
      }
      return legend;
    };

    legend.labelFormat = function (_) {
      if (!arguments.length) return labelFormat;
      labelFormat = _;
      return legend;
    };

    legend.labelOffset = function (_) {
      if (!arguments.length) return labelOffset;
      labelOffset = +_;
      return legend;
    };

    legend.labelDelimiter = function (_) {
      if (!arguments.length) return labelDelimiter;
      labelDelimiter = _;
      return legend;
    };

    legend.orient = function (_) {
      if (!arguments.length) return orient;
      _ = _.toLowerCase();
      if (_ == "horizontal" || _ == "vertical") {
        orient = _;
      }
      return legend;
    };

    legend.ascending = function (_) {
      if (!arguments.length) return ascending;
      ascending = !!_;
      return legend;
    };

    legend.classPrefix = function (_) {
      if (!arguments.length) return classPrefix;
      classPrefix = _;
      return legend;
    };

    legend.title = function (_) {
      if (!arguments.length) return title;
      title = _;
      return legend;
    };

    legend.on = function () {
      var value = legendDispatcher.on.apply(legendDispatcher, arguments);
      return value === legendDispatcher ? legend : value;
    };

    return legend;
  };

  exports.legendColor = color;
  exports.legendSize = size;
  exports.legendSymbol = symbol;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=indexRollup.js.map
