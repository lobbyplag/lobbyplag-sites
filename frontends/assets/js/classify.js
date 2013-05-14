var fix_height = function () {
	$('#main-container').css('min-height', $(window).innerHeight() - 220);
};

var navig = {};

var classifyAmmendment = function () {
	var data = {
		id: navig.id,
		vote: $('input:radio[name=vote]:checked').val(),
		tags: $('#tags-select').val()
	};
	$.post('/classify/submit/', data, function (data) {
		$('#output').html(data);
	});
};

var getAmmendment = function (uid) {
	$.get('/classify/amendment/' + uid, {}, function (data) {
		navig = data.navig || {};
		$('#output').html('');
		$('input:radio[name="vote"]').attr('checked', false);
		$('#tags-select').val([]).trigger('liszt:updated');
		console.log(data.classified);
		if (data.classified) {
			$('input:radio[name=vote][value="' + data.classified.vote + '"]').prop('checked', true);
			$('#tags-select').val(data.classified.tags).trigger('liszt:updated');
		}
		$('#amendment').html(data.html);
	});
};

Chosen.prototype.choice_build = function (item) {
	var choice_id, html, link,
		_this = this;
	if (this.is_multiple && this.max_selected_options <= this.choices) {
		this.form_field_jq.trigger("liszt:maxselected", {
			chosen: this
		});
		return false;
	}
	choice_id = this.container_id + "_c_" + item.array_index;
	this.choices += 1;
	var hint = $('#cat_' + item.value).attr('hint');
	if (item.disabled) {
		html = '<li class="search-choice search-choice-disabled" id="' + choice_id + '"><span>' + item.html + '</span></li>';
	} else {
		html = "<li class='search-choice' title='" + hint
			+ "' id='" + choice_id + "'><span>" + item.html +
			"</span><a href='javascript:void(0)' class='search-choice-close' rel='" +
			item.array_index + "'></a></li>";
	}
	this.search_container.before(html);
	link = $('#' + choice_id).find("a").first();
	return link.click(function (evt) {
		return _this.choice_destroy_link_click(evt);
	});
};

AbstractChosen.prototype.result_add_option = function (option) {
	var classes, style;
	if (!option.disabled) {
		option.dom_id = this.container_id + "_o_" + option.array_index;
		classes = option.selected && this.is_multiple ? [] : ["active-result"];
		if (option.selected) {
			classes.push("result-selected");
		}
		if (option.group_array_index != null) {
			classes.push("group-option");
		}
		if (option.classes !== "") {
			classes.push(option.classes);
		}
		style = option.style.cssText !== "" ? " style=\"" + option.style + "\"" : "";
		var hint = $('#cat_' + option.value).attr('hint');
		return "<li id='" + option.dom_id + "' title='" + hint + "' class='" + classes.join(' ') + "'" + style + ">" + option.html + "</li>";
	} else {
		return "";
	}
};

$(document).ready(function () {
	$('#tags-select').chosen();
	$('#btn_submit').click(function () {
		classifyAmmendment();
	});
	$('#btn_random').click(function () {
		getAmmendment('');
	});
	$('#btn_next').click(function () {
		getAmmendment(navig.next);
	});
	$('#btn_next_unchecked').click(function () {
		getAmmendment(navig.next_unchecked);
	});
	$('#btn_prev').click(function () {
		getAmmendment(navig.prev);
	});
	$('#btn_prev_unchecked').click(function () {
		getAmmendment(navig.prev_unchecked);
	});
	getAmmendment('');
	fix_height();
});

$(window).resize(function () {
	fix_height();
});
