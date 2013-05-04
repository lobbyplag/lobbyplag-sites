$(document).ready(function(){
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
});
