var fix_height = function () {
	var ht = 120;
	var h = $('#subnav .nav').height() || 0;
	$('#subnav').css('height', h);
	ht += h;
	h = $('#subnav_map .nav').height() || 0;
	$('#subnav_map').css('height', h);
	ht += h;
	h = $('#subnav_map_search .nav-search').height() || 0;
	$('#subnav_map_search').css('height', h);
	ht += h;
	h = $('#subnav_map_small .nav').height() || 0;
	$('#subnav_map_small').css('height', h);
	ht += h;
	$('#main-container').css('min-height', $(window).innerHeight() - ht);
}

$(document).ready(function () {
	fix_height();
});

$(window).resize(function () {
	//remove settings for "no script on"
	$('#subnav').css('min-width', 0);
	$('#subnav_map').css('min-width', 0);
	$('#subnav_map_small').css('min-width', 0);
	fix_height();
});
