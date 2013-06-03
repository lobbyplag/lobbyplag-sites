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

Array.prototype.hasOneMepByConstituency = function (constituency_id) {
	for (var i = 0; i < this.length; i++) {
		if (this[i].constituency === constituency_id) {
			return true;
		}
	}
	return false;
};

var filterConstituenciesByGroupAndCountry = function (obj, group_id, country_id) {
	if (obj[country_id]) {
		return obj[country_id].filter(function (constituency) {
			return constituency.group === group_id;
		});
	} else
		return [];
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

var raw_constituencies = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'constituencies.json')));
var constituencies = {};
for (var key in raw_constituencies) {
	if (raw_constituencies.hasOwnProperty(key)) {
		raw_constituencies[key].forEach(function (_raw_constituency) {
			_raw_constituency.country = key;
			constituencies[_raw_constituency.id] = _raw_constituency;
		});
	}
}


var raw_countries = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'countries.json')));
var countries = [];
for (var key in raw_countries) {
	countries.push(
		{id: key, name: raw_countries[key]}
	);
}

var raw_groups = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'groups.json')));
var groups = [];
for (var key in raw_groups) {
	raw_groups[key].id = key;
	groups.push(raw_groups[key]);
}

var raw_amendments = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'amendments.json')));
var classified_data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './data', 'classified.json')));
classified_data.forEach(function (c) {
	c.amend = raw_amendments.findByUID(c.uid);
});
classified_data = classified_data.filter(function (c) {
	return c.user === 'MS';
});

var raw_meps_data = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'mep.json')));
var meps = [];
for (var key in raw_meps_data) {
	var _mep = raw_meps_data[key];
	_mep.id = key;
	_mep.country_obj = countries.findByID(_mep.country);
	if (!_mep.country_obj)
		console.log('Missing Country for: ' + _mep.country);
	_mep.group_obj = groups.findByID(_mep.group);
	if (!_mep.group)
		console.log('Missing Group for: ' + _mep.group);

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

classified_data.forEach(function (c) {
	c.meps = meps.filter(function (mep) {
		return c.amend.author_ids.indexOf(mep.id) >= 0;
	});
	if (c.meps.length === 0) {
		console.log('Amendment without Authors ' + c.uid);
	}
});

/* configure Express */

var app = express();

app.configure(function () {
	app.use(express.bodyParser());
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
	app.use(express.favicon(__dirname + '/../assets/img/favicon.ico'));
	app.use(express.logger('dev'));
});


/* read template */
var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(__dirname + "/../assets/tmpl/header.mustache").toString(),
	footer: fs.readFileSync(__dirname + "/../assets/tmpl/footer.mustache").toString(),

	overview: fs.readFileSync(path.resolve(__dirname, "tmpl/overview.mustache")).toString(),
	country: fs.readFileSync(path.resolve(__dirname, "tmpl/country.mustache")).toString(),
	topics: fs.readFileSync(path.resolve(__dirname, "tmpl/topics.mustache")).toString(),
	meps: fs.readFileSync(path.resolve(__dirname, "tmpl/meps.mustache")).toString(),
	group: fs.readFileSync(path.resolve(__dirname, "tmpl/group.mustache")).toString(),

	mep_line: fs.readFileSync(path.resolve(__dirname, "tmpl/mep_line.mustache")).toString(),
	mail: fs.readFileSync(path.resolve(__dirname, "tmpl/mail.mustache")).toString()
};

var sendTemplate = function (req, res, template, data) {
	data["active_map"] = true;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, data, {
		"main": template,
		"mep_line": tmpl.mep_line,
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
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

/* index */
app.get(config.prefix, function (req, res) {
	sendTemplate(req, res, tmpl.overview, {"active_overview": true,
		tops: meps.tops(),
		flops: meps.flops()
	})
});
app.get(config.prefix + '/overview', function (req, res) {
	sendTemplate(req, res, tmpl.overview, {
		"active_overview": true,
		tops: meps.tops(),
		flops: meps.flops()
	})
});
app.get(config.prefix + '/countries', function (req, res) {
	sendTemplate(req, res, tmpl.country, {
		"active_countries": true,
		countries: countries,
		tops: meps.tops(),
		flops: meps.flops(),
		overview: classified_data.getClassifiedOverview()
	});
});
app.get(config.prefix + '/countries/:country', function (req, res) {
	var _country = countries.findByID(req.params.country);
	if (!_country) {
		sendTemplate(req, res, tmpl.country, {
			"active_countries": true,
			countries: countries,
			tops: meps.tops(),
			flops: meps.flops(),
			overview: classified_data.getClassifiedOverview()
		});
	} else {
		var _countries = countries.map(function (country) {
			return {id: country.id, name: country.name, active: country.id === _country.id};
		});
		var _meps = meps.filterMepsByCountry(_country.id);
		var _overview = classified_data.filterClassifiedByCountry(_country.id);

		sendTemplate(req, res, tmpl.country, {
			"active_countries": true,
			countries: _countries,
			country: _country,
			tops: _meps.tops(),
			flops: _meps.flops(),
			overview: _overview.getClassifiedOverview()
		})
	}
});

app.get(config.prefix + '/groups', function (req, res) {
	var _group = groups[0];
	var _groups = groups.map(function (group) {
		return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
	});
	var _countries = countries.map(function (country) {
		return {id: country.id, name: country.name, group_id: _group.id};
	});
	var _meps = meps.filterMepsByGroup(_group.id);
	sendTemplate(req, res, tmpl.group, {
		"active_groups": true,
		group: _group,
		groups: _groups,
		countries: _countries,
		tops: _meps.tops(),
		flops: _meps.flops(),
		overview: classified_data.filterClassifiedByGroup(_group.id).getClassifiedOverview()
	});
});

function sendGroup(req, res, _group) {
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
	sendTemplate(req, res, tmpl.group, {
		"active_groups": true,
		group: _group,
		groups: _groups,
		countries: _countries,
		tops: _meps.tops(),
		flops: _meps.flops(),
		overview: classified_data.filterClassifiedByGroup(_group.id).getClassifiedOverview()
	});
}

app.get(config.prefix + '/groups/:group', function (req, res) {
	sendGroup(req, res, groups.findByID(req.params.group) || groups[0]);
});

app.get(config.prefix + '/groups/:group/:country', function (req, res) {
		var _group = groups.findByID(req.params.group) || groups[0];
		var _country = countries.findByID(req.params.country);
		if (!_country) {
			sendGroup(req, res, _group);
			return;
		}
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
					var _name = constituencies[mep.constituency].short;
					if (_constituencies.indexOf(_name) < 0)
						_constituencies.push(_name);
				}
			});
		});
		if ((_constituencies) && (_constituencies.length > 0)) {
			_local = '(' + _constituencies.join(', ') + ')';
		}
		sendTemplate(req, res, tmpl.group, {
			"active_groups": true,
			group: _group,
			groups: _groups,
			country: _country,
			countries: _countries,
			tops: _meps.tops(),
			flops: _meps.flops(),
			localparties: _local,
			overview: _overview.getClassifiedOverview()
		});
	}
)
;


app.get(config.prefix + '/meps', function (req, res) {
	var query = url.parse(req.url, true).query;
	var _meps;
	var _mep;
	var _message;
	if ((query.q) && (query.q.length > 0)) {
		_meps = meps.filter(function (mep) {
			return mep.name.indexOf(query.q) >= 0;
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
	sendTemplate(req, res, tmpl.meps, {
		"active_meps": true,
		meps: _meps,
		meps_haschildren: ((_meps) && (_meps.length > 1)),
		mep: _mep,
		message: _message,
		"typeahead": JSON.stringify(_typeahead)
	});
});


app.get(config.prefix + '/topics', function (req, res) {
	sendTemplate(req, res, tmpl.topics, {"active_topics": true})
});


app.get(config.prefix + '/mail', function (req, res) {
	sendTemplate(req, res, tmpl.mail, {})
});


app.listen(config.port, config.hostname);
console.log('Listen ' + config.hostname + ':' + config.port);
