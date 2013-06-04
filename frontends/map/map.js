var path = require('path')
	, fs = require('fs')
	, url = require('url')
	, mustache = require('mustache')
	, express = require('express');

var config = require(path.resolve(__dirname, './config.js'));

Array.prototype.findByUID = function (id) {
	for (var i = 0; i < this.length; i++) {
		if (this[i].uid === id) {
			return this[i];
		}
	}
	return null;
};

Array.prototype.findByID = function (id) {
	for (var i = 0; i < this.length; i++) {
		if (this[i].id === id) {
			return this[i];
		}
	}
	return null;
};

Array.prototype.hasOneMepWithDataByCountry = function (country_id) {
	for (var i = 0; i < this.length; i++) {
		if ((this[i].votes.total > 0) && (this[i].country === country_id)) {
			return true;
		}
	}
	return false;
};

Array.prototype.filterMepsByGroup = function (group_id) {
	return this.filter(function (mep) {
		return mep.group === group_id;
	});
};

Array.prototype.filterMepsByCountry = function (country_id) {
	return this.filter(function (mep) {
		return mep.country === country_id;
	});
};

Array.prototype.getClassifiedOverview = function () {
	var result = {pro: 0, contra: 0, neutral: 0};
	this.forEach(function (c) {
		if (c.vote === "neutral")
			result.neutral += 1;
		else if (c.vote === "weaker")
			result.contra += 1;
		else if (c.vote === "stronger")
			result.pro += 1;
	});
	result.total = result.pro + result.contra + result.neutral;
	result.rate = result.pro - result.contra;
	return result;
};

Array.prototype.filterClassifiedByGroupAndCountry = function (group_id, country_id) {
	return this.filter(function (c) {
		for (var i = 0; i < c.meps.length; i++) {
			if ((c.meps[i].group === group_id) && (c.meps[i].country === country_id)) {
				return true;
			}
		}
		return false;
	});
};

Array.prototype.filterClassifiedByGroup = function (group_id) {
	return this.filter(function (c) {
		for (var i = 0; i < c.meps.length; i++) {
			if (c.meps[i].group === group_id) {
				return true;
			}
		}
		return false;
	});
};

Array.prototype.filterClassifiedByCountry = function (country_id) {
	return this.filter(function (c) {
		for (var i = 0; i < c.meps.length; i++) {
			if (c.meps[i].country === country_id)
				return true;
		}
		return false;
	});
};

Array.prototype.flops = function () {
	var result = this.filter(function (o) {
		return ((o.votes.total > 0) && (o.votes.rate <= 0));
	});
	result.sort(function (a, b) {
		if (a.votes.rate < b.votes.rate)
			return -1;
		if (a.votes.rate > b.votes.rate)
			return 1;
		if (a.votes.contra < b.votes.contra)
			return -1;
		if (a.votes.contra > b.votes.contra)
			return 1;
		if (a.votes.name < b.votes.name)
			return -1;
		if (a.votes.name > b.votes.name)
			return 1;
		return 0;
	});
	return result.slice(0, 10);
};

Array.prototype.tops = function () {
	var result = this.filter(function (o) {
		return ((o.votes.total > 0) && (o.votes.rate >= 0));
	});
	result.sort(function (a, b) {
		if (a.votes.rate < b.votes.rate)
			return 1;
		if (a.votes.rate > b.votes.rate)
			return -1;
		if (a.votes.pro < b.votes.pro)
			return -1;
		if (a.votes.pro > b.votes.pro)
			return 1;
		if (a.votes.name < b.votes.name)
			return -1;
		if (a.votes.name > b.votes.name)
			return 1;
		return 0;
	});
	return result.slice(0, 10);
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

var constituencies = {};
function initConstituencies() {
	var raw_constituencies = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'constituencies.json')));
	for (var key in raw_constituencies) {
		if (raw_constituencies.hasOwnProperty(key)) {
			raw_constituencies[key].forEach(function (_raw_constituency) {
				_raw_constituency.country = key;
				constituencies[_raw_constituency.id] = _raw_constituency;
			});
		}
	}
}
initConstituencies();

var countries = [];
function initCountries() {
	var raw_countries = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'countries.json')));
	for (var key in raw_countries) {
		if (raw_countries.hasOwnProperty(key)) {
			var country = {id: key, name: raw_countries[key]}
			country.iso = key;
			if (country.iso === 'uk') {
				country.iso = 'gb';
			} else if (country.iso === 'ir') {
				country.iso = 'ie';
			}
			countries.push(country);
		}
	}
}
initCountries();

var groups = [];
function initGroups() {
	var raw_groups = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'groups.json')));
	for (var key in raw_groups) {
		raw_groups[key].id = key;
		groups.push(raw_groups[key]);
	}
}
initGroups();

var all_classified_data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './data', 'classified.json')));
var classified_data = [];

function initClassified() {
	var raw_amendments = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'amendments.json')));
	all_classified_data.forEach(function (c) {
		c.amend = raw_amendments.findByUID(c.uid);
		c.amend.diff = c.amend.text[0].diff;
		if ((!c.amend.relations) || (!c.amend.relations[0]))
			console.log('Missing Amendment Relation to Directive: ' + c.uid);
		else
			c.amend.directive = c.amend.relations[0].expand();
	});
	classified_data = all_classified_data.filter(function (c) {
		return c.user === 'MS';
	});
}
initClassified();

var meps = [];
function initMEPs() {
	var raw_committees_data = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'committees.json')));
	var raw_meps_data = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'mep.json')));
	for (var key in raw_meps_data) {
		var _mep = raw_meps_data[key];
		_mep.id = key;
		_mep.country_obj = countries.findByID(_mep.country);
		if (!_mep.country_obj)
			console.log('Missing Country for: ' + _mep.country);
		_mep.group_obj = groups.findByID(_mep.group);
		if (!_mep.group)
			console.log('Missing Group for: ' + _mep.group);

		if (_mep.committees) {
			_mep.committees.forEach(function (committee) {
				committee.name = raw_committees_data[committee.id];
			});
		}
		_mep.constituency_obj = constituencies[_mep.constituency];
		_mep.votes = {
			pro: 0,
			contra: 0,
			neutral: 0,
			rate: 0,
			total: 0
		};

		classified_data.forEach(function (c) {
			if (c.user === 'MS') {
				c.amend.author_ids.forEach(function (autor) {
					if (autor === _mep.id) {
						if (c.vote === "neutral")
							_mep.votes.neutral += 1;
						else if (c.vote === "weaker")
							_mep.votes.contra += 1;
						else if (c.vote === "stronger")
							_mep.votes.pro += 1;
						_mep.votes.rate = _mep.votes.pro - _mep.votes.contra;
						_mep.votes.total = _mep.votes.pro + _mep.votes.contra + _mep.votes.neutral;
					}
				});
			}
		});

		meps.push(_mep);
	}
}
initMEPs();

function updateClassifiedWithMeps() {
	all_classified_data.forEach(function (c) {
		c.meps = meps.filter(function (mep) {
			return c.amend.author_ids.indexOf(mep.id) >= 0;
		});
		if (c.meps.length === 0) {
			console.log('Amendment without Authors ' + c.uid);
		}
	});
}
updateClassifiedWithMeps();


//var classified_data_edri = all_classified_data.filter(function (c) {
//	return c.user === 'EDRI';
//});
//classified_data_edri.forEach(function (c) {
//	var ms = classified_data.findByUID(c.uid);
//	var _meps = c.meps.map(function (m) {
//		return m.name;
//	}).join(', ');
//	console.log(c.amend.uid + ';' + c.amend.directive + ';' + _meps + ';' + ms.category + ';' + c.amend.number + ';' + ms.vote + ';' + c.vote+';'+(ms.vote !== c.vote));
//});


/* configure Express */

var app = express();

app.configure(function () {
	app.use(express.favicon(__dirname + '/../assets/img/favicon.ico'));
	app.use(express.compress());
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
	if (config.debug) {
		app.use(express.logger('dev'));
	} else {
		app.use(express.logger());
	}
});


/* templates */

var filtercache = {};
var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(__dirname + "/../assets/tmpl/header.mustache").toString(),
	footer: fs.readFileSync(__dirname + "/../assets/tmpl/footer.mustache").toString(),

	overview: fs.readFileSync(path.resolve(__dirname, "tmpl/overview.mustache")).toString(),
	country: fs.readFileSync(path.resolve(__dirname, "tmpl/country.mustache")).toString(),
	topics: fs.readFileSync(path.resolve(__dirname, "tmpl/topics.mustache")).toString(),
	meps: fs.readFileSync(path.resolve(__dirname, "tmpl/meps.mustache")).toString(),
	group: fs.readFileSync(path.resolve(__dirname, "tmpl/group.mustache")).toString(),

	countries_map: fs.readFileSync(path.resolve(__dirname, "tmpl/countries_map.mustache")).toString(),
	pie: fs.readFileSync(path.resolve(__dirname, "tmpl/pie.mustache")).toString(),
	group_bars: fs.readFileSync(path.resolve(__dirname, "tmpl/group_bars.mustache")).toString(),
	mep_line: fs.readFileSync(path.resolve(__dirname, "tmpl/mep_line.mustache")).toString(),
	mail: fs.readFileSync(path.resolve(__dirname, "tmpl/mail.mustache")).toString()
};

var sendTemplate = function (req, res, template, data) {
	data.active_map = true;
	data.disable_email = true;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
//	if (!config.debug) {
//		var oneHour = 3600;
//		res.setHeader('Cache-Control', 'public, max-age=' + (oneHour));
//	}
	res.send(mustache.render(tmpl.index, data, {
		"main": template,
		"mep_line": tmpl.mep_line,
		"group_bars": tmpl.group_bars,
		"countries_map": tmpl.countries_map,
		"pie": tmpl.pie,
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
};

function generateGroupOverview(list) {
	var _group_overview = [];
	groups.forEach(function (group) {
		var obj = list.filterClassifiedByGroup(group.id).getClassifiedOverview();
		delete obj.total;
		delete obj.rate;
		_group_overview.push({
			group: group,
			overview: JSON.stringify(obj)
		})
	});
	return _group_overview;
}

function sendIndex(req, res) {
	var _data = filtercache['index'];
	if (!_data) {
		var _overview_countries = {};
		countries.forEach(function (country) {
			var obj = classified_data.filterClassifiedByCountry(country.id).getClassifiedOverview();
			delete obj.total;
			delete obj.rate;
			_overview_countries[country.id] = obj;
		});
		_data = {
			"active_overview": true,
			overview_countries: JSON.stringify(_overview_countries),
			group_overview: generateGroupOverview(classified_data),
			tops: meps.tops(),
			flops: meps.flops()
		};
		filtercache['index'] = _data;
	}
	sendTemplate(req, res, tmpl.overview, _data);
}

app.get(config.prefix, function (req, res) {
	sendIndex(req, res);
});

app.get(config.prefix + '/overview', function (req, res) {
	sendIndex(req, res);
});

function sendCountries(req, res) {
	var _data = filtercache['countries'];
	if (!_data) {
		var _countries = countries.filter(function (country) {
			return meps.hasOneMepWithDataByCountry(country.id);
		});
		var _overview_countries = {};
		_countries.forEach(function (country) {
			var obj = classified_data.filterClassifiedByCountry(country.id).getClassifiedOverview();
			delete obj.total;
			delete obj.rate;
			_overview_countries[country.id] = obj;
		});
		_data = {
			"active_countries": true,
			countries: _countries,
			tops: meps.tops(),
			flops: meps.flops(),
			overview_countries: JSON.stringify(_overview_countries),
			overview: classified_data.getClassifiedOverview()
		};
		filtercache['countries'] = _data;
	}
	sendTemplate(req, res, tmpl.country, _data);
}

app.get(config.prefix + '/countries', function (req, res) {
	sendCountries(req, res);
});

function sendCountry(_country, req, res) {
	var _data = filtercache['country' + _country.id];
	if (!_data) {
		var _countries = countries.filter(function (country) {
			return meps.hasOneMepWithDataByCountry(country.id);
		}).map(function (country) {
				return {id: country.id, name: country.name, active: country.id === _country.id};
			});
		var _meps = meps.filterMepsByCountry(_country.id);
		var _overview = classified_data.filterClassifiedByCountry(_country.id);
		_data = {
			"active_countries": true,
			countries: _countries,
			country: _country,
			tops: _meps.tops(),
			flops: _meps.flops(),
			group_overview: generateGroupOverview(_overview),
			overview: _overview.getClassifiedOverview()
		};
		filtercache['country' + _country.id] = _data;
	}
	sendTemplate(req, res, tmpl.country, _data)
}

app.get(config.prefix + '/countries/:country', function (req, res) {
	var _country = countries.findByID(req.params.country);
	if (!_country) {
		sendCountries(req, res);
	} else {
		sendCountry(_country, req, res);
	}
});

function sendGroup(_group, req, res) {
	var _data = filtercache['group' + _group.id];
	if (!_data) {
		var _groups = groups.map(function (group) {
			return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
		});
		var _countries = countries.map(function (country) {
			return {id: country.id, name: country.name, group_id: _group.id};
		});
		var _meps = meps.filterMepsByGroup(_group.id);
		_countries = _countries.filter(function (country) {
			return (_meps.hasOneMepWithDataByCountry(country.id));
		});
		var _classified = classified_data.filterClassifiedByGroup(_group.id);
		var _overview_countries = {};
		_countries.forEach(function (country) {
			var obj = _classified.filterClassifiedByCountry(country.id).getClassifiedOverview();
			delete obj.total;
			delete obj.rate;
			_overview_countries[country.id] = obj;
		});
		_data = {
			"active_groups": true,
			group: _group,
			groups: _groups,
			countries: _countries,
			tops: _meps.tops(),
			flops: _meps.flops(),
			overview_countries: JSON.stringify(_overview_countries),
			overview: _classified.getClassifiedOverview()
		};
		filtercache['group' + _group.id] = _data;
	}
	sendTemplate(req, res, tmpl.group, _data);
}

app.get(config.prefix + '/groups', function (req, res) {
	sendGroup(groups[0], req, res)
});

app.get(config.prefix + '/groups/:group', function (req, res) {
	sendGroup(groups.findByID(req.params.group) || groups[0], req, res);
});

function sendGroupCountry(_group, _country, req, res) {
	var _data = filtercache['grocou' + _group.id + _country.id];
	if (!_data) {
		var _meps = meps.filterMepsByGroup(_group.id);
		var _groups = groups.map(function (group) {
			return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
		});
		var _countries = countries.map(function (country) {
			return {id: country.id, name: country.name, group_id: _group.id, active: ((_country) && (country.id === _country.id))};
		}).filter(function (country) {
				return (_meps.hasOneMepWithDataByCountry(country.id));
			});
		var _overview = classified_data.filterClassifiedByGroupAndCountry(_group.id, _country.id);
		var _local;
		_meps = _meps.filterMepsByCountry(_country.id);
		var _constituencies = [];
		_overview.forEach(function (c) {
			c.meps.forEach(function (mep) {
				if ((mep.country === _country.id) && (mep.group === _group.id)) {
					if (!constituencies[mep.constituency]) {
						if (mep.constituency)
							console.log(mep.constituency);
					} else {
						var _name = constituencies[mep.constituency].short;
						if (_constituencies.indexOf(_name) < 0)
							_constituencies.push(_name);
					}
				}
			});
		});
		if ((_constituencies) && (_constituencies.length > 0)) {
			_local = '(' + _constituencies.join(', ') + ')';
		}
		_data = {
			"active_groups": true,
			group: _group,
			groups: _groups,
			country: _country,
			countries: _countries,
			tops: _meps.tops(),
			flops: _meps.flops(),
			localparties: _local,
			overview: _overview.getClassifiedOverview()
		};
		filtercache['grocou' + _group.id + _country.id] = _data;
	}
	sendTemplate(req, res, tmpl.group, _data);
}

app.get(config.prefix + '/groups/:group/:country', function (req, res) {
	var _group = groups.findByID(req.params.group) || groups[0];
	var _country = countries.findByID(req.params.country);
	if (!_country) {
		sendGroup(req, res, _group);
	} else {
		sendGroupCountry(_group, _country, req, res);
	}
});

app.get(config.prefix + '/meps', function (req, res) {
	var query = url.parse(req.url, true).query;
	var _meps;
	var _mep;
	var _message;
	var _classified;
	if ((query.q) && (query.q.length > 0)) {
		var _search = query.q.toLowerCase();
		_meps = meps.filter(function (mep) {
			return mep.name.toLowerCase().indexOf(_search) >= 0;
		});
		if (_meps.length === 1) {
			_mep = _meps[0];
			_meps = null;
		} else {
			_message = 'Found ' + _meps.length;
		}
	}
	if ((query.id) && (query.id.length > 0)) {
		var _mapi = meps.findByID(query.id);
		if (_mapi) {
			_message = null;
			_meps = null;
			_mep = _mapi;
		}
	}
	var _typeahead = meps.map(function (mep) {
		return mep.name;
	});
	if (_mep) {
		_classified = classified_data.filter(function (c) {
			return c.amend.author_ids.indexOf(_mep.id) >= 0;
		});
		_classified.sort(function (a, b) {
			if (a.amend.number < b.amend.number)
				return -1;
			if (a.amend.number > b.amend.number)
				return 1;
			return 0;
		});
	}
	sendTemplate(req, res, tmpl.meps, {
		"active_meps": true,
		meps: _meps,
		meps_haschildren: ((_meps) && (_meps.length > 0)),
		mep: _mep,
		message: _message,
		classified: _classified,
		classified_haschildren: ((_classified) && (_classified.length > 0)),
		"typeahead": JSON.stringify(_typeahead)
	});
});

/* TODO */

String.prototype.extractRoot = function () {
	return this.toString().replace(/([+hrcaspit])/g,function (l) {
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
			case "+":
				return "| ";
				break;
		}
	}).replace(/^\|/, '').split(/\|/g)[0];
};

function sendTopics(req, res) {
	var _data = filtercache['topics'];
	if (!_data) {

		var _topics_keys = {};
		classified_data.forEach(function (c) {
			var _root = c.amend.relations.join('|').extractRoot();
			_topics_keys[_root] = _topics_keys[_root] || [];
			_topics_keys[_root].push(c);
		});
		var _topics = [];
		for (var key in _topics_keys) {
			var obj = {directive: key};
			var list = _topics_keys[key];
			obj.number = _topics.length;
			obj.overview = list.getClassifiedOverview();
			obj.group_overview = generateGroupOverview(list);
			_topics.push(obj);
		}
		_data = {
			active_topics: true,
			topics: _topics
		};
		filtercache['topics'] = _data;
	}
	sendTemplate(req, res, tmpl.topics, _data);
}

app.get(config.prefix + '/topics', function (req, res) {
	sendTopics(req, res);
});

app.get(config.prefix + '/mail', function (req, res) {
	sendTemplate(req, res, tmpl.mail, {})
});

/* Server */

app.listen(config.port, config.hostname);
console.log('Listen ' + config.hostname + ':' + config.port);
