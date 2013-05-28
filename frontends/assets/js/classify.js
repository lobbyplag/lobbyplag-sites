var fix_heights = function () {
	//poor layouting
	var space = 8;
	var height = $("#header").height() + space;
	var middlehead = $("#middlehead");
	middlehead.css('top', height);
	height += middlehead.height();
	var bottom = $("#bottom");
	var foot = $("#foot");
	foot.css('height', $("#footrow").height());
	bottom.css('top', height);
	bottom.css('bottom', foot.height());
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
		topic: $('#topic').val(),
		conflict: $('#conflict').is(':checked')
	};
	$.post('/classify/submit/', _data, function (data) {
		if (data.error) {
			alert(data.error);
		} else {
			displayAmmendment(data);
		}
	});
};

var buildAuthor = function (author) {
	return '<div class="display-person">' + author.name +
		' <span class="label label-info label-country" title="' + author.country_long + '">' +
		author.country + '</span> <span class="label label-info label-group" title="' +
		author.group_long + '">' +
		author.group + '</span></div>';
}

var buildAuthors = function (authors) {
	var html = "";
	if (authors)
		authors.forEach(function (author) {
			html += buildAuthor(author);
		});
	$('#authors').html(html);
};

$.fn.typeahead.Constructor.prototype.show =
	function () {
		var pos = $.extend({}, this.$element.position(), {
			height: this.$element[0].offsetHeight
		})
		this.$menu
			.insertAfter(this.$element)
			.css({
				top: pos.top - this.$menu.height() - 10, left: pos.left
			})
			.show()

		this.shown = true
		return this;
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
	if (data.classified.conflict) {
		$('#conflict').attr('checked', 'checked');
	} else {
		$('#conflict').removeAttr('checked');
	}
	$('#directive').text(data.laws[0].name);
	$('#topic').val(data.classified.topic).trigger('liszt:updated');
	$('#saveindicator').hide();
	navig = data.navig || {};
	buildAuthors(data.amend.authors);
	if (data.cats) {
		$('#category').typeahead({source: data.cats, items: 10});
	}
	$('#btn_next').toggleClass('disabled', (!navig.next));
	$('#btn_prev').toggleClass('disabled', (!navig.prev));
	$('#btn_next_unchecked').toggleClass('disabled', (!navig.next_unchecked));
	$('#btn_prev_unchecked').toggleClass('disabled', (!navig.prev_unchecked));
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

function setCookie(c_name, value, exdays) {
	var exdate = new Date();
	exdate.setDate(exdate.getDate() + exdays);
	var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
	document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
	var c_value = document.cookie;
	var c_start = c_value.indexOf(" " + c_name + "=");
	if (c_start == -1) {
		c_start = c_value.indexOf(c_name + "=");
	}
	if (c_start == -1) {
		c_value = null;
	}
	else {
		c_start = c_value.indexOf("=", c_start) + 1;
		var c_end = c_value.indexOf(";", c_start);
		if (c_end == -1) {
			c_end = c_value.length;
		}
		c_value = unescape(c_value.substring(c_start, c_end));
	}
	return c_value;
}

var enterUsername = function () {
	$('#myModal').modal({keyboard: false, show: true});
};

var showChanged = function () {
	$('#saveindicator').show();
};

$(document).ready(function () {
	$('#saveindicator').hide();
	$('#topic').chosen({allow_single_deselect: true});
	fix_heights();

	$('#conflict').change(showChanged);
	$('#comment').change(showChanged);
	$('#comment').keydown(showChanged);
	$('#category').change(showChanged);
	$('#category').keydown(showChanged);
	$('#topic').change(showChanged);

	$('#totallysecret').click(function () {
		$('#authors').toggle();
	});

//	$('#directive').mouseenter(function() {
//		$('#authors').show();
//	});
//	$('#directive').mouseout(function() {
//		$('#authors').hide();
//	});

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
	$('#btn_next_unchecked').click(function () {
		getAmmendment(navig.next_unchecked);
	});
	$('#btn_prev_unchecked').click(function () {
		getAmmendment(navig.prev_unchecked);
	});
	setupKeyCommands();

	$('#myModal').on('hidden', function () {
		var newusername = $("#username").val().trim();
		if ((newusername === null) || (newusername === "")) {
			enterUsername();
		} else {
			user = newusername;
			setCookie("username", user);
			getAmmendment('start');
		}
	});
	if ((user === null) || (user === "")) {
		var username = getCookie("username");
		if (username != null && username != "") {
			user = username;
		}
	}
	if ((user !== null) && (user !== "")) {
		getAmmendment('start');
	} else {
		enterUsername();
	}
});

$(window).resize(function () {
	fix_heights();
});
