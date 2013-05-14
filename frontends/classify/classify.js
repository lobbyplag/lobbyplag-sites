#!/usr/bin/env node

/* get confog */
var path = require('path');
var fs = require('fs');
var express = require('express');
var mustache = require('mustache');
var url = require('url');

var config = require(path.resolve(__dirname, './config.js'));

/* read template */
var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(path.resolve(__dirname, "../assets/tmpl/header.mustache")).toString(),
	footer: fs.readFileSync(path.resolve(__dirname, "../assets/tmpl/footer.mustache")).toString(),
	mep: fs.readFileSync(path.resolve(__dirname, "tmpl/mep.mustache")).toString(),
	tgc: fs.readFileSync(path.resolve(__dirname, "tmpl/tgc.mustache")).toString(),
	law: fs.readFileSync(path.resolve(__dirname, "tmpl/law.mustache")).toString(),
	amend: fs.readFileSync(path.resolve(__dirname, "tmpl/amend.mustache")).toString()
};

var tagcats = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'legacy/implications.json')));
tagcats.forEach(function (cat) {
	cat.name = cat.text.en.short;
	cat.desc = cat.text.en.description;
});
tagcats.sort(function (a, b) {
	if (a.name < b.name)
		return -1;
	if (a.name > b.name)
		return 1;
	return 0;
});

/* get amendments */
var amendments = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "amendments.json")).toString());
var amendments_index = {};
var amendments_by_ids = {};
function initAmendments() {
	var _mep = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'mep.json')));
	var _mep_groups = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'groups.json')));
	var _countries = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'countries.json')));

	amendments.sort(function (a, b) {
		if (a.committee === b.committee) {
			if (a.number < b.number)
				return -1;
			if (a.number < b.number)
				return 1;
			return 0;
		}
		if (a.committee < b.committee)
			return -1;
		return 1;
	});

	amendments.forEach(function (_amend, idx) {
		amendments_by_ids[_amend.uid] = _amend;
		var _authors = [];
		_amend.author_ids.forEach(function (_author_id) {
			if ((_author_id in _mep)) {
				_authors.push({
					"name": _mep[_author_id].name,
					"country": _mep[_author_id].country,
					"country_long": _countries[_mep[_author_id].country],
					"group": _mep_groups[_mep[_author_id].group].short,
					"group_long": _mep_groups[_mep[_author_id].group].long
				});
			} else {
				console.log('Author ' + _author_id + 'not found :.(');
			}
		});
		_amend.authors = _authors;

		amendments_index[_amend.uid] = idx;

	});
}

initAmendments();

/* get classified */
var classified = [];
var classified_by_ids = {};
var classify_filename = path.resolve(__dirname, config.datadir, "classified.json");

if (fs.exists(classify_filename, function (exists) {
	if (exists) {
		classified = JSON.parse(fs.readFileSync(classify_filename).toString());
		classified.forEach(function (_classi) {
			classified_by_ids[_classi.uid] = _classi;
		});
	}
}));

var save_classified = function () {
	fs.writeFileSync(path.resolve(__dirname, config.datadir, "classified.json"), JSON.stringify(classified, null, '\t'));
};

var getIndexOfAmendment = function (id) {
	return amendments_index[id] || -1;
};

/* save data on sigint */
process.on('SIGINT', function () {
	console.log('Caught SIGINT');
	save_classified();
	process.exit();
});

/* handle uncaught exception, just in case */
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

var app = express();

app.configure(function () {
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
	app.use(express.favicon(__dirname + '../assets/img/favicon.ico'));
//	app.use(express.logger('dev'));
	app.use(express.bodyParser());
});

var get_random_unclassified = function () {
	var _unclassified = amendments.filter(function (_amend) {
		return !classified_by_ids[_amend.uid];
	});
	if (_unclassified.length === 0) return -2;
	var _amend = _unclassified[Math.floor(Math.random() * _unclassified.length)];
	return getIndexOfAmendment(_amend.uid);
};

var parcelNavig = function (index) {
	var _navig = {};
	if ((index >= 0) && (index < amendments.length))
		_navig.id = amendments[index].uid;
	if ((index > 0) && (index < amendments.length))
		_navig.prev = amendments[index - 1].uid;
	if ((index >= 0) && (index < amendments.length))
		_navig.next = amendments[index + 1].uid;
	if (index < amendments.length) {
		for (var i = index - 1; i >= 0; i--) {
			if (!_navig.prev) {
				_navig.prev = amendments[i].uid
			}
			if (!classified_by_ids[amendments[i].uid]) {
				_navig.prev_unchecked = amendments[i].uid;
				break; //we're done
			}
		}
	}
	if (index >= 0) {
		for (var i = index + 1; i < amendments.length; i++) {
			if (!_navig.next) {
				_navig.next = amendments[i].uid
			}
			if (!classified_by_ids[amendments[i].uid]) {
				_navig.next_unchecked = amendments[i].uid;
				break; //we're done
			}
		}
	}
	return _navig;
};

String.prototype.expand = function () {
	return this.toString().replace(/([hrcaspit])/g,function (l) {
		switch (l) {
			case "h":
				return "|Title ";
				break;
			case "r":
				return "|Recital ";
				break;
			case "c":
				return "|Chapter ";
				break;
			case "s":
				return "|Section ";
				break;
			case "a":
				return "|Article ";
				break;
			case "p":
				return "|Paragraph ";
				break;
			case "i":
				return "|Point ";
				break;
			case "t":
				return "|Text ";
				break;
		}
	}).replace(/^\|/, '').split(/\|/g).join(" – ");
};

var sendAmendment = function (res, index) {
	var _amend = amendments[index];
	if (!_amend) {
		res.json([]);
		return;
	}

	var _laws = [];
	_amend.relations.forEach(function (_relation) {
		_laws.push({
			url: 'http://lobbyplag.eu/browse/show/' + _relation,
			name: _relation.expand()
		});
	});

	var _parcel = {};
	_parcel.navig = parcelNavig(index);
	_parcel.html = mustache.render(tmpl.amend, {
			"amend": {
				uid: _amend.uid,
				committee: _amend.committee,
				number: _amend.number,
				authors: _amend.authors,
				diff: _amend.text[0].diff,
				laws: _laws
			}
		},
		{
			"mep": tmpl.mep,
			"law": tmpl.law
		}
	);
	_parcel.classified = classified_by_ids[_amend.uid];
	res.json(_parcel);
};

/* get something to classify */
app.get(config.prefix + '/amendment/:id', function (req, res) {
	var index;
	if (req.params.id) {
		index = getIndexOfAmendment(req.params.id);
	}
	index = index || get_random_unclassified();
	sendAmendment(res, index);
});

app.get(config.prefix + '/amendment', function (req, res) {
	sendAmendment(res, get_random_unclassified());
});

app.get(config.prefix, function (req, res) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		urlprefix: config.prefix,
		tagcats: tagcats
	}, {
		"tgc": tmpl.tgc,
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

app.post(config.prefix + '/submit', function (req, res) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	if ((!req.body.id) || (!amendments_by_ids[req.body.id] )) {
		res.send('An transmission error occured, please reload the site');
	} else if (!req.body.vote) {
		res.send('Please choose a classification');
	} else {
		var _classified = classified_by_ids[req.body.id];
		if (!_classified) {
			_classified = {uid: req.body.id};
			classified_by_ids[req.body.id] = _classified;
			classified.push(_classified);
		}
		_classified.vote = req.body.vote;
		_classified.tags = [];
		if (req.body.tags) {
			_classified.tags = req.body.tags;
		}
		res.send('\\o/ Saved. Thank you!');
		save_classified();
	}
	res.end();
});

app.get('*', function (req, res) {
	res.status(404);
	res.send("meh.");
	res.end();
});

app.listen(config.port, config.hostname);

console.log('Listen ' + config.hostname + ':' + config.port);
