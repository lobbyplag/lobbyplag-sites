var tmpl = {};

$(document).ready(function(){

	$('#main-container').css('min-height', $(window).innerHeight()-372);
	
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
	
});

$(window).resize(function(){
	$('#main-container').css('min-height', $(window).innerHeight()-372);
});

function discard(that, item) {
	
	$(that).replaceWith('<p><em class="pull-right">Dieser Treffer wurde als falsch markiert.</em></p>');
	
	$.get('http://research.lobbyplag.eu/report?wrong='+item, function(){});
	
}

function verify(that, item) {
	
	$(that).replaceWith('<p><em class="pull-right">Dieser Treffer wurde als richtig markiert.</em></p>');
	
	$.get('http://research.lobbyplag.eu/report?right='+item, function(){});
	
}

