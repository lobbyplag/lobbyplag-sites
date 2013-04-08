$(document).ready(function(){
	fix_window();
});

$(window).resize(function(){
	fix_window();
});

var fix_window = function(){
	$('#main-container').css('min-height', ($(window).innerHeight()-262));
};
