var fix_height = function () {
	var h = 162
		+ ($('#subnav_map').height() || 0)
		+ ($('#subnav_map_search').height() || 0)
		+ ($('#subnav_map_small').height() || 0);
	$('#main-container').css('min-height', $(window).innerHeight() - h);
}

$(document).ready(function () {
	fix_height();
});

$(window).resize(function () {
	fix_height();
});
