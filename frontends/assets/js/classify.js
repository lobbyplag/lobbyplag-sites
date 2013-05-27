var fix_heights = function () {
	//poor layouting
	var space = 8;
	var height = $("#header").height() + space;
	var middlehead = $(".middlehead");
	middlehead.css('top', height);
	height += middlehead.height();
//	var middle = $(".middle");
//	middle.css('top', height);
//	height += middle.height() + space;
	$(".bottom").css('top', height);
};

var navig = {};
var user = '';

var classifyAmmendment = function (vote) {
	var _data = {
		id: navig.id,
		vote: vote,
		user: user,
		category: $('#category').val(),
		comment: $('#comment').val(),
		topic: $('#topic').val()
	};
	$.post('/classify/submit/', _data, function (data) {
		if (data.error) {
			alert(data.error);
		} else {
			displayAmmendment(data);
		}
	});
};

var displayAmmendment = function (data) {
	$('#oldtext').html(data.amend.text[0].old);
	$('#newtext').html(data.amend.text[0].diff);
	$('#user').text(data.user);
	$('#committee').text(data.amend.committee);
	$('#number').text(data.amend.number);
	$('#classified').text(data.classified.vote);
	$('#comment').val(data.classified.comment);
	$('#category').val(data.classified.category);
	$('#directive').text(data.laws[0].name);
	$('#topic').val(data.classified.topic).trigger('liszt:updated');
	navig = data.navig || {};
};

var getAmmendment = function (uid) {
	$.get('/classify/amendment/' + uid + '/' + user, {}, function (data) {
		if (data.amend) {
			displayAmmendment(data);
		} else {
			alert('no data');
		}
	});
};

var setupKeyCommands = function () {
	shortcut.add("ctrl+left", function () {
		$('#btn_prev').click();
		return false;
	});
	shortcut.add("ctrl+right", function () {
		$('#btn_next').click();
		return false;
	});

//	shortcut.add("ctrl+S", function () {
//		$("#datalove").submit();
//	});
//	shortcut.add("ctrl+D", function () {
//		fetchText();
//		return false;
//	});
//	shortcut.add("ctrl+L", function () {
//		$('#txt_old').val('');
//		$('#txt_new').val('');
//		return false;
//	});
//	shortcut.add("ctrl+alt+left", function () {
//		$('#txt_old').val('');
//		return false;
//	});
//	shortcut.add("ctrl+alt+right", function () {
//		$('#txt_new').val('');
//		return false;
//	});
//	shortcut.add("shift+alt+left", function () {
//		clean($('#txt_old'));
//		return false;
//	});
//	shortcut.add("shift+alt+right", function () {
//		clean($('#txt_new'));
//		return false;
//	});
//	shortcut.add("ctrl+right", function () {
//		$(":range").data("rangeinput").step(1);
//		return false;
//	});
//	shortcut.add("ctrl+left", function () {
//		$(":range").data("rangeinput").step(-1);
//		return false;
//	});
//	shortcut.add("ctrl+down", function () {
//		directiveSelection(1);
//		return false;
//	});
//	shortcut.add("ctrl+alt+down", function () {
//		directiveSelection(10);
//		return false;
//	});
//	shortcut.add("ctrl+up", function () {
//		directiveSelection(-1);
//		return false;
//	});
//	shortcut.add("ctrl+alt+up", function () {
//		directiveSelection(-10);
//		return false;
//	});
//	shortcut.add("alt+1", function () {
//		$("#directive" + "_chzn").trigger('mousedown');
//		return false;
//	});
//	shortcut.add("alt+2", function () {
//		$("#where" + "_chzn").trigger('mousedown');
//		return false;
//	});
//	shortcut.add("alt+3", function () {
//		$("#what" + "_chzn").trigger('mousedown');
//		return false;
//	});
//	shortcut.add("alt+4", function () {
//		$("#doc" + "_chzn").trigger('mousedown');
//		return false;
//	});
//	shortcut.add("alt+5", function () {
//		$("#pagenr").focus();
//		return false;
//	});
//	shortcut.add("alt+6", function () {
//		$("#txt_old").focus();
//		return false;
//	});
//	shortcut.add("alt+7", function () {
//		$("#txt_new").focus();
//		return false;
//	});
};

var enterUsername = function () {
	$('#myModal').modal({keyboard: false, show: true});
};

$(document).ready(function () {
	$('#topic').chosen({allow_single_deselect: true});
	fix_heights();

	$('#btn_stronger').click(function () {
		classifyAmmendment('stronger');
		return false;
	});
	$('#btn_weaker').click(function () {
		classifyAmmendment('weaker');
		return false;
	});
	$('#btn_neutral').click(function () {
		classifyAmmendment('neutral');
		return false;
	});
	$('#btn_next').click(function () {
		getAmmendment(navig.next);
	});
	$('#btn_prev').click(function () {
		getAmmendment(navig.prev);
	});
//	$('#btn_next_unchecked').click(function () {
//		getAmmendment(navig.next_unchecked);
//	});
//	$('#btn_prev_unchecked').click(function () {
//		getAmmendment(navig.prev_unchecked);
//	});
	setupKeyCommands();

	$('#myModal').on('hidden', function () {
		var newusername = $("#username").val().trim();
		if (newusername === "")
			enterUsername();
		else {
			user = newusername;
			getAmmendment('start');
		}
	})
	if (user === "") {
		enterUsername();
	} else {
		getAmmendment('start');
	}
});

$(window).resize(function () {
	fix_heights();
});
