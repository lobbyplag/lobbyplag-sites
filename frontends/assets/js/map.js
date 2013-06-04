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

function setReportResultError(data) {
	$("#report_info").text(data);
	$("#report_info").show();
}

function setReportResultOK(data) {
	alert(data);
}

function sendReport(nr, vote, comment, user) {
	$("#report_info").hide();
	$.post('/map/report/', {nr: nr, vote: vote, comment: comment, user: user},function (data) {
		if (data.indexOf('Error:') !== 0) {
			$('#reportErrorModal').modal('hide');
			$('#report_comment').val('');
			$(':radio').prop('checked', false);
			setReportResultOK(data);
		} else {
			setReportResultError(data);
		}
	}).fail(function () {
			setReportResultError("We're sorry. An error occured");
		});
};

function reportError(vote, nr) {
	if (nr) {
		$("#report_info").hide();
		$('#btn_send').unbind('click');
		$('#btn_send').click(function () {
			sendReport(nr, $('input[name=vote]:checked', '#report_vote').val(), $('#report_comment').val(), $('#report_name').val());
		});
		$('#current_amend').text(nr);
		$('#current_rating').text(vote);
		$('#reportErrorModal').modal({keyboard: true, show: true});
	}
};