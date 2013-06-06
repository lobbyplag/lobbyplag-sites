/*
 *  Project: Lobbyplag Classify Graphs
 *  Description: Maps and Donut Charts
 *  Author: mv@datenfreunde.com
 *  boilerplate: http://jqueryboilerplate.com/
 */

;
(function ($, window, document, undefined) {

	var pluginName = "lpchart",
		defaults = {
			red: "#DD0000",
			green: "#009900",
			neutral: "#E0E0E0",
			box: "#E6E6E6",
			boxborder: "#B6B6B6",
			animationspeed: 50,
			startregions: ["IE", "DK", "IT", "UK"], /* For map - countries in focus for initial display */
			onClickRegion: function () {
			}            /* Called when Click on country happens */
		},
		o;

	function Plugin(element, options) {
		this.element = element;
		this.$element = $(element);
		o = $.extend({}, defaults, options);
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype = {

		init: function () {
			$('.lobbyplag').each(
				function (idx, ele) {
					$(ele).attr("class").split(" ").forEach(function (n) {
						if (typeof charttype[n] != "undefined") {
							//console.log(n);
							charttype[n](ele);
						}
					});
				});
		}

	};

// A really lightweight plugin wrapper around the constructor,
// preventing against multiple instantiations
	$.fn[pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin(this, options));
			}
		});
	};

	function _makescore(d) {
		return(d.pro - d.contra);
	}

	var charttype = {
		pie: function (element) {
			if (element.r)
				return;
			var w = $(element).parent().width();  //element might not be validated and of wrong width
			var h = $(element).parent().height(); //element might not be validated and of wrong width
			var ra = (Math.min(w, h) / 2) - 1;
			var r = Raphael(element);
			element.r = r;
			var d = $(element).data("lobbyplag");
			var numbers = r.set();
			numbers.push(r.rect(1, 1, w - 2, h - 2).attr({fill: "#ffffff", "stroke-width": "0px"  }));
			numbers.push(r.text(w / 2, h * 0.2, d.pro /*+ " str"*/).attr({ fill: o.green, "font-size": h * 0.25 + "px"}));
			numbers.push(r.text(w / 2, h * 0.5, d.contra /*+ " wea"*/).attr({ fill: o.red, "font-size": h * 0.25 + "px"}));
			numbers.push(r.text(w / 2, h * 0.8, d.neutral /*+ " neu"*/).attr({ fill: o.neutral, "font-size": h * 0.25 + "px"}).darker(3));
			numbers.attr('opacity', 0);//no animation upfront for performance
			//numbers.toBack().animate({ opacity: 0  });
			var graph = r.set();
			var dset = [];
			var cset = [];
			var colormap = { "pro": o.green, "contra": o.red, "neutral": o.neutral };
			$(["pro", "neutral", "contra"]).each(function (i, e) {
				if (d[e] > 0) {
					dset.push(d[e]);
					cset.push(colormap[e]);
				}
			});
			var pie = r.piechart(w / 2, h / 2, ra, dset,
				{ unsorted: true,
					startangle: 90,
					colors: cset });
			graph.push(pie);
			graph.push(r.circle(w / 2, h / 2, ra * 0.6).attr({ fill: defaults.neutral, stroke: o.neutral }));
			var score = _makescore(d);
			var scorecolor = score > 0 ? o.green : o.red;
			graph.push(r.text(w / 2, 2 * (h / 4), score).attr({ "font-size": h * 0.4 + "px", fill: scorecolor}).darker(2));
			numbers.toFront();
			$('svg', element).height(h).width(w); //make sure svg width & height are properly set, because of weird raphaels default bounds
			$(element).bind("mouseover",function () {
				numbers.animate({ opacity: 1 }, o.animationspeed)
			}).bind("mouseout", function () {
					numbers.animate({ opacity: 0 }, o.animationspeed)
				});
		},
		bar: function (element) {
			if (element.r)
				return;
			var r = Raphael(element);
			element.r = r;
			var d = $(element).data("lobbyplag");
			var w = $(element).parent().width();  //element might not be validated and of wrong width
			var h = $(element).parent().height(); //element might not be validated and of wrong width
			//	console.log('init bar h:' + h + ' w:' + w);
			var numbers = r.set();
			var barheight = h * 0.75;
			var bartop = ((h - barheight) / 2);
			var texty = bartop + (h * 0.5) - 2;
			numbers.push(r.rect(0, 0, w, h).attr({fill: "#ffffff", "stroke-width": "0px" }));
			numbers.push(r.text(w - 10, texty, d.pro + " stronger").attr({ fill: o.green, "font-size": h * 0.5 + "px", "text-anchor": "end"}));
			numbers.push(r.text(10, texty, d.contra + " weaker").attr({ fill: o.red, "font-size": h * 0.5 + "px", "text-anchor": "start"}));
			numbers.push(r.text(w / 2, texty, d.neutral + " neutral").attr({ fill: o.neutral, "font-size": h * 0.5 + "px"}).darker(3));
			numbers.attr('opacity', 0); //no animation upfront for performance
			//numbers.toBack().animate({ opacity: 0  });
			var graph = r.set();
			var bar = r.hbarchart(1, bartop + 1, w, barheight, [
				[d.contra],
				[d.neutral],
				[d.pro]
			],
				{ stacked: true,
					gutter: 2,
					vgutter: 0,
					stretch: true,
					colors: [o.red, o.neutral, o.green]
				});
			graph.push(bar);
			graph.push(r.rect(w * 0.4, 1, w * 0.2, h - 1).attr({ fill: o.box, stroke: o.boxborder }));
			var score = _makescore(d);
			var scorecolor = score > 0 ? o.green : o.red;
			graph.push(r.text(w / 2, h * 0.5, score).attr({ "font-size": h * 0.8 + "px", fill: scorecolor   }).darker(2));
			numbers.toFront();
			$(element).bind("mouseover",function () {
				numbers.animate({ opacity: 1 }, o.animationspeed)
			}).bind("mouseout", function () {
					numbers.animate({ opacity: 0 }, o.animationspeed)
				});
		},
		vectormap: function (element) {
			if (element.r)
				return;
			element.r = true;
			var d = $(element).data("lobbyplag");
			var vmap = new jvm.WorldMap({
				map: 'europe_merc_en',
				container: $(element),
				series: {
					regions: [
						{
							attribute: 'fill'
						}
					]
				},
				onRegionLabelShow: function (e, el, code) {
					if (typeof scores[code] != "undefined") {
						var sc = scores[code];
						if (sc) {
							el.html(el.html() + '\n<b><span style="color: ' + colors[code] + '">' + _makescore(sc) + "</b><br/><span style='color:" + o.green + "'>" + sc.pro + "</span> / <span style='color:#000000'>" + sc.neutral + "</span> / <span style='color:" + o.red + "'>" + sc.contra + "</span>");
						} else {
							el.html(el.html() + "<br/><i>no amendments</i>");
						}
					} else {
						e.preventDefault();
					}
				},
				onRegionClick: function (e, code) {
					if (typeof o.onClickRegion != "undefined") {
						if ((typeof scores[code] != "undefined") && (scores[code] != 0)) {
							o.onClickRegion(code);
						}
					}
				}
			});
			vmap.setFocus(o.startregions);
			var colors = {};
			var scores = {};
			for (var key in d) {
				if (d.hasOwnProperty(key)) {
					var values = d[key];
					var score = _makescore(values);
					var scorecolor = score > 0 ? o.green : o.red;
					var voted = values.pro + values.contra + values.neutral;
					var uc = key.toUpperCase();
					if (typeof vmap.regions[uc] != "undefined") {
						if (voted) {
							scores[uc] = values;
							colors[uc] = scorecolor;
						} else {
							scores[uc] = 0;
							colors[uc] = o.neutral;
						}
					} else {
						console.log("unknown region:" + uc);
					}

				}
			}
			vmap.series.regions[0].setValues(colors);
			// this.$element.vectorMap("set","regionStyle",colors);
		}
	}

})(jQuery, window, document);
