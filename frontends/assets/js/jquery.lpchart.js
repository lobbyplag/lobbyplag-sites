/*
 *  Project: Lobbyplag Classify Graphs
 *  Description: Maps and Donut Charts
 *  Author: mv@datenfreunde.com
 *  boilerplate: http://jqueryboilerplate.com/
 */

;(function ( $, window, document, undefined ) {

    var pluginName = "lpchart",
        defaults = {
            red: 	 "#DD0000",
            green: 	 "#009900",
            neutral: "#E0E0E0",
            startregions: ["IE","DK","IT","UK"],   /* For map - countries in focus for initial display */
            onClickRegion : function() {}   			/* Called when Click on country happens */
        };

    function Plugin( element, options ) {
        this.element = element;
        this.$element= $(element);
        this.options = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    Plugin.prototype = {

        init: function() {
			var that=this;
			_.each(this.$element.attr("class").split(" "), function(n) {
				if (typeof charttype[n] != "undefined") {
					charttype[n].apply(that);
				}
			});

        },



    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin( this, options ));
            }
        });
    };

	function _makescore(d) {
		return(d.pro-d.contra);
	}
	
	var charttype = {
				pie : function() {
					var r=Raphael(this.element);
					this.r=r;
					var d=this.$element.data("lobbyplag");
					var w=this.$element.innerWidth();
					var h=this.$element.innerHeight();
			        var o=this.options;
			        var r=this.r;
					var ra=(_.min([w,h])/2)-1;
					var numbers=r.set();
					numbers.push(r.rect(1,1,w-2, h-2).attr({fill: "#ffffff", "stroke-width": "0px"	}))
					numbers.push(r.text(w/2,h*0.2,d.pro+" str").attr({ fill: o.green, "font-size" : h*0.25+"px"}));
					numbers.push(r.text(w/2,h*0.5,d.contra+" wea").attr({ fill: o.red, "font-size" : h*0.25+"px"}	));
					numbers.push(r.text(w/2,h*0.8,d.neutral+" neu").attr({ fill: o.neutral, "font-size" : h*0.25+"px"}).darker(3)	);
					numbers.toBack().animate({ opacity : 0  });			
					graph=r.set()
					var pie=r.piechart(w/2,h/2,ra,[d.pro,d.neutral,d.contra],
											{ unsorted: true, 
											  startangle: 90, 
											  colors : [o.green,o.neutral,o.red] } );
					graph.push(pie);					      
					graph.push(r.circle(w/2,h/2,ra*0.6).attr({ fill : o.neutral, stroke: o.neutral }));
					var score=_makescore(d);
					var scorecolor= score>0 ? o.green : o.red;
					graph.push(r.text(w/2,2*(h/4),score).attr({ "font-size" : h*0.4+"px", fill : scorecolor   }).darker(2));
					numbers.toFront();
					this.$element.bind("mouseover",function() { numbers.animate({ opacity: 1 }, 100) } );
					this.$element.bind("mouseout",function() { numbers.animate({ opacity: 0 }, 100) });					
				},
				bar : function() {
					var r=Raphael(this.element);
					this.r=r;
					var d=this.$element.data("lobbyplag");
					var w=this.$element.innerWidth();
					var h=this.$element.innerHeight();
			        var o=this.options;
			        var r=this.r;
					var numbers=r.set();
					numbers.push(r.rect(0,0,w,h).attr({fill: "#ffffff", "stroke-width": "0px"	}))
					numbers.push(r.text(w-10,10,d.pro+" str").attr({ fill: o.green, "font-size" : h*0.5+"px", "text-anchor": "end"}));
					numbers.push(r.text(10,10,d.contra+" wea").attr({ fill: o.red, "font-size" : h*0.5+"px", "text-anchor" : "start"}	));
					numbers.push(r.text(w/2,10,d.neutral+" neu").attr({ fill: o.neutral, "font-size" : h*0.5+"px"}).darker(3)	);
					numbers.toBack().animate({ opacity : 0  });			
					graph=r.set()
					var bar=r.hbarchart(0,h*0.05,w,h*0.9,[[d.contra],[d.neutral],[d.pro]],
											{ stacked: true,
											  gutter: 0,
											  vgutter: 0,
											  colors : [o.red,o.neutral,o.green] 
											});
					graph.push(bar);				
					graph.push(r.rect(w*0.4,0,w*0.2,h).attr({ fill: o.neutral, stroke: o.neutral }));	      
					var score=_makescore(d);
					var scorecolor= score>0 ? o.green : o.red;
					graph.push(r.text(w/2,h*0.5,score).attr({ "font-size" : h*0.8+"px", fill : scorecolor   }).darker(2));
					numbers.toFront();
					this.$element.bind("mouseover",function() { numbers.animate({ opacity: 1 }, 100) } );
					this.$element.bind("mouseout",function() { numbers.animate({ opacity: 0 }, 100) });					
				},
				vectormap : function() {
					var d=this.$element.data("lobbyplag");
			        var o=this.options;
			        var vmap = new jvm.WorldMap({
									map: 'europe_merc_en',
									container: this.$element,
									series: {
										regions: [{
											attribute: 'fill'
										}],
									},
									onRegionLabelShow: function(e, el, code){
											if (typeof scores[code] != "undefined") {
												var sc=scores[code];
												if (sc) {
													el.html(el.html()+'\n<b><span style="color: '+colors[code]+'">'+_makescore(sc)+"</b><br/><span style='color:"+o.green+"'>"+sc.pro+"</span>/<span style='color:#000000'>"+sc.neutral+"</span>/<span style='color:"+o.red+"'>"+sc.contra+"</span>");
													} else {
													el.html(el.html()+"<br/><i>no amendments</i>");	
													}
												} else {
													e.preventDefault();
												}
									},
									onRegionClick : function(e,code) {
										if (typeof o.onClickRegion != "undefined") {
											if ((typeof scores[code] != "undefined") && (scores[code] != 0)) {
												o.onClickRegion(code);
											}
										}
									}
						});
			        vmap.setFocus(o.startregions);
			        var colors={};
			        var scores={};
			        _.each(_.keys(d),function(k) {
						var score=_makescore(d[k]);
						var scorecolor= score>0 ? o.green : o.red;
						var voted=d[k].pro+d[k].contra+d[k].neutral;
						var uc=k.toUpperCase();
						if (typeof vmap.regions[uc] != "undefined") {
							if (voted) {
								scores[uc]=d[k];
								colors[uc]=scorecolor;
							} else {
								scores[uc]=0;
								colors[uc]=o.neutral;
							}
						} else {
							console.log("unknown region:" +uc);
						}
					});
					vmap.series.regions[0].setValues(colors);
					// this.$element.vectorMap("set","regionStyle",colors);
					
				}
				
				
			
			
		}



})( jQuery, window, document );
