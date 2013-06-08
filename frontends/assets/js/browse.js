var tmpl = {};

String.prototype.times = function(n) {
	return new Array(n+1).join(this);
};

$(document).ready(function(){
	
	// fix min height
	$('#main-container').css('min-height', $(window).innerHeight()-262);

	/* readjust width for indicator items */
	$('a', '#indicator').css("width", ($('#indicator').innerWidth()-10)/$('li', '#indicator').length)

	/* show paragraph title on hover */
	$('a', '#indicator').hover(function(){
		var $a = $(this);
		var $txt = $('span', $a).text().match(/^(.*) \(([0-9]+)\/([0-9]+)\)$/);
		var $bdg_amd = (parseInt($txt[2],10) > 0) ? '<span class="badge badge-info">'+$txt[2]+' Amendments</span>' : '';
		var $bdg_prp = (parseInt($txt[3],10) > 0) ? '<span class="badge badge-warning">'+$txt[3]+' Proposals</span>' : '';
		$('#indicator-hint').html($txt[1]+' <span class="pull-right">'+$bdg_amd+' '+$bdg_prp+'</span>');
	});
	
	/* hide indicator-hint on leave */
	$('#indicator').hover(function(){
		$('#indicator-hint-container').fadeIn('fast');
	},function(){
		$('#indicator-hint-container').fadeOut('fast');
	});

	/* get templates */
// file does not exists
// $.get('assets/tmpl/directive.mustache', function(data){
//		tmpl['directive'] = data;
//	},'html');

	/* apply diff buttons */
	apply_buttons();
	
	/* apply language buttons */
	apply_lang();
	
	History.Adapter.bind(window,'statechange', function(){
		_route(History.getState().data); 
	});
		
	/*
	// apply_buttons();
	_list();
	_indicator();
	*/
	
});

$(window).resize(function(){
	
	/* readjust min height */
	$('#main-container').css('min-height', $(window).innerHeight()-262);

	/* readjust width for indicator items */
	$('a', '#indicator').css("width", ($('#indicator').innerWidth()-10)/$('li', '#indicator').length)

});

$(window).scroll(function(){
	if ($(window).scrollTop() > 60) {
		$('body').addClass('attached');
	} else {
		$('body').removeClass('attached');
	}
});

var apply_lang = function() {
	$('a.lang-select').click(function(){
		$('a','#lang-buttons').removeClass('btn-inverse').addClass('btn-default');
		var $c = 'show-lang-'+$(this).attr('data-lang');
		if ($('body').hasClass($c)) {
			$('body').removeClass($c);
			$('body').removeClass('lang-filter');
		} else {
			$(this).removeClass('btn-default').addClass('btn-inverse');
			$('body').removeClass(function(i,c){
				return (c.match(/show-lang-[a-z]{2}/)) ? c.match(/show-lang-[a-z]{2}/).join(' ') : null;
			});
			$('body').addClass($c);
			$('body').addClass('lang-filter');
		}
	});
}

var apply_buttons = function() {
	$('.diff-buttons a').click(function(){
		var $btn = $(this);
		if ($btn.hasClass('btn-primary')) return;
		var $diff = $('.diff', $btn.parent().parent());
		$('a', $btn.parent()).not(this).removeClass('btn-primary').addClass('btn-inverse');
		$btn.removeClass('btn-inverse').addClass('btn-primary');
		if ($btn.hasClass('button-new')) {
			$diff.removeClass('old');
			$diff.addClass('new');
		} else if ($btn.hasClass('button-old')) {
			$diff.addClass('old')
			$diff.removeClass('new');
		} else {
			$diff.removeClass('old')
			$diff.removeClass('new');
		}
	});
}

/*

var _route = function(data) {
	if ('show' in data) {
		if ($('#directive-'+data.show).length === 0) {
			// load directive
			$.getJSON('data/directive/'+data.show+'.json', function(data){
				$('#main').html($.mustache(tmpl['directive'], data));
			});
		} else {
			// check for other
		}
	} else {
		// show default
	}
}

var _list = function() {
	var $t = $('<table></table>').addClass('table');
	var $th = $('<thead></thead>');
	$th.append($('<tr></tr>').append('<th>Directive Part</th>').append('<th>Committee Amendments</th>').append('<th>Lobby Proposals</th>'))
	var $tb = $('<tbody></tbody>');
	$.getJSON('/assets/data/list.json', function(data){
		$(data).each(function(idx,item){
			var $tr = $('<tr></tr>');
			$tr.append($('<td>'+('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'.times(item.level))+'<a href="/show/'+item.id+'"  data-route="{\'show\':\''+item.id+'\'}" title="'+item.title+'">'+item.title.replace(/ /,'&nbsp;')+'</a></td>'));
			var $ca = [];
			var $cp = []
			if (("children" in item) && typeof item.children === 'object') {
				$(item.children).each(function(idx,c){
					switch(c.type) {
						case "a":
							$ca.push('<li><a href="/show/'+item.id+'/amendment/'+c.id+'" data-route="{\'show\':\''+item.id+'\',\'amendment\':\''+c.id+'\'}" title="'+c.title+'">'+c.title+"</a></li>");
						break;
						case "p":
							$cp.push('<li><a href="/show/'+item.id+'/proposal/'+c.id+'" data-route="{\'show\':\''+item.id+'\',\'proposal\':\''+c.id+'\'}" title="'+c.title+'">'+c.title+"</a></li>");
						break;
					}
				});
			}
			$cp = ($cp.length > 0) ? "<ul>"+$cp.join("\n")+"</ul>" : "";
			$ca = ($ca.length > 0) ? "<ul>"+$ca.join("\n")+"</ul>" : "";
			$tr.append('<td>'+$ca+'</td>');
			$tr.append('<td>'+$cp+'</td>');
			$tb.append($tr);
		});
		$t.append($th);
		$t.append($tb);
		$('#main').append($t);
	});
}

var _indicator = function() {
	$('#indicator').append('<ul id="directive-items"></ul>');
	var $e = $('<li><a href=""><span class="meta"></span></a></li>')
	var $d = $('#directive-items');
	$('#indicator').css('width', $('#indicator').innerWidth()-20);
	var $w = $('#indicator').innerWidth()-10;
	$.getJSON('/assets/data/indicator.json', function(data){
		var $l = data.length;
		$(data).each(function(idx,item){
			var $lp = (item.num.proposals > 0) ? "important" : "default";
			var $la = (item.num.amendments > 0) ? "important" : "default";
			$('a', $e.clone().attr('id','indicator-'+(item.id)).appendTo($d)).css({
				"width": ($w/data.length)+"px",
				"background-color": "hsla("+(((item.flat.amendments-item.flat.proposals)*50)+25)+",100%,50%,"+item.perc.total*3+")"
			}).attr('href','show/'+item.id).attr('data-route','{"show":"'+item.id+'"}').click(function(e){
				e.preventDefault();
				var data = JSON.parse($(this).attr("data-route"));
				History.pushState(data, null, $(this).attr("href"));
				//_route(data);
				return false;
			}).find('span.meta').css({
				"color": "hsla("+(((item.flat.amendments-item.flat.proposals)*50)+25)+",100%,50%,1)",
				"left": ((idx/$l) > 0.5) ? ((idx/$l)*$w*-1)+50 : ((idx/$l)*$w*-1)+($w-350)
			}).html('<span class="location">'+item.title+'</span> <span class="labels"><span class="label label-'+$la+' amendments">'+item.num.amendments+' Am.</span> <span class="label label-'+$lp+' proposals">'+item.num.proposals+" Pr.</span></span>");
		});
	});
}

*/