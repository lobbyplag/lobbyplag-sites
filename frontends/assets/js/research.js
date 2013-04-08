var tmpl = {};

$(document).ready(function(){
	$('#main-container').css('min-height', $(window).innerHeight()-372);

	$('#research-form').submit(function(evt){
		evt.preventDefault();
		if ("pushState" in history) {
			history.pushState({q: $('#q').val()}, "", "search?q="+$('#q').val());
		}
		perform_search({q: $('#q').val()});
		return false;
	});
	
	$.get('assets/tmpl/result.mustache', function(data){
		tmpl['result'] = data;
	},'html');
	
	apply_buttons();
	
	window.onpopstate = function(ev){
		$('#q').val(ev.state.q);
		perform_search(ev.state);
	};
	
});

$(window).resize(function(){
	$('#main-container').css('min-height', $(window).innerHeight()-372);
});

var perform_search = function(data) {
	$.getJSON('http://research.lobbyplag.eu/api', data, function(result){
		console.log(result);
		$('#main').html(Mustache.render(tmpl.result, result));
		apply_buttons();
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
			$diff.removeClass('old')
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
