var fix_height = function() {
	$('#main-container').css('min-height', $(window).innerHeight()-220);
}

$(document).ready(function(){
	fix_height();
});

$(window).resize(function(){
	fix_height();
});
