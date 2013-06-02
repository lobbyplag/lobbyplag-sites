var path = require('path')
	, fs = require('fs')
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

Array.prototype.filterByGroup = function (group_id) {
	return this.filter(function (mep) {
		return mep.group === group_id;
	});
};

Array.prototype.filterByCountry = function (country_id) {
	return this.filter(function (mep) {
		return mep.country === country_id;
	});
};

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

	_mep.votes = {
		pro: 0,
		contra: 0,
		neutral: 0
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
				}
			});
		}
	});

	meps.push(_mep);
}

/* configure Express */

var app = express();

app.configure(function () {
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
	app.use(express.favicon(__dirname + '/../assets/img/favicon.ico'));
});


/* read template */
var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(__dirname + "/../assets/tmpl/header.mustache").toString(),
	footer: fs.readFileSync(__dirname + "/../assets/tmpl/footer.mustache").toString(),

	overview: fs.readFileSync(path.resolve(__dirname, "tmpl/overview.mustache")).toString(),
	countries: fs.readFileSync(path.resolve(__dirname, "tmpl/countries.mustache")).toString(),
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
	this.sort(function (a, b) {
		if (a.votes.contra > b.votes.contra)
			return -1;
		if (a.votes.contra < b.votes.contra)
			return 1;
		if (a.votes.name < b.votes.name)
			return -1;
		if (a.votes.name > b.votes.name)
			return 1;
		return 0;
	});
	return this.slice(0, 9);
};

Array.prototype.tops = function () {
	this.sort(function (a, b) {
		if (a.votes.pro > b.votes.pro)
			return -1;
		if (a.votes.pro < b.votes.pro)
			return 1;
		if (a.votes.name < b.votes.name)
			return -1;
		if (a.votes.name > b.votes.name)
			return 1;
		return 0;
	});
	return this.slice(0, 9);
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
	sendTemplate(req, res, tmpl.countries, {
		"active_countries": true,
		countries: countries,
		tops: meps.tops(),
		flops: meps.flops()
	});
});
app.get(config.prefix + '/countries/:country', function (req, res) {
	var _country = countries.findByID(req.params.country);
	if (!_country) {
		sendTemplate(req, res, tmpl.countries, {
			"active_countries": true,
			countries: countries,
			tops: meps.tops(),
			flops: meps.flops()
		});
	} else {
		var _countries = countries.map(function (country) {
			return {id: country.id, name: country.name, active: country.id === _country.id};
		});
		var _meps = meps.filterByCountry(_country.id);
		sendTemplate(req, res, tmpl.country, {
			"active_countries": true,
			countries: _countries,
			country: _country,
			tops: _meps.tops(),
			flops: _meps.flops()
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
	var _meps = meps.filterByGroup(_group.id);
	sendTemplate(req, res, tmpl.group, {
		"active_groups": true,
		group: _group,
		groups: _groups,
		countries: _countries,
		tops: _meps.tops(),
		flops: _meps.flops()
	});
});
app.get(config.prefix + '/groups/:group', function (req, res) {
	var _group = groups.findByID(req.params.group) || groups[0];
	var _groups = groups.map(function (group) {
		return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
	});
	var _countries = countries.map(function (country) {
		return {id: country.id, name: country.name, group_id: _group.id};
	});
	var _meps = meps.filterByGroup(_group.id);
	sendTemplate(req, res, tmpl.group, {
		"active_groups": true,
		group: _group,
		groups: _groups,
		countries: _countries,
		tops: _meps.tops(),
		flops: _meps.flops()
	});
});

app.get(config.prefix + '/groups/:group/:country', function (req, res) {
	var _group = groups.findByID(req.params.group) || groups[0];
	var _country = countries.findByID(req.params.country);
	var _groups = groups.map(function (group) {
		return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
	});
	var _countries = countries.map(function (country) {
		return {id: country.id, name: country.name, group_id: _group.id, active: ((_country) && (country.id === _country.id))};
	});
	var _meps = meps.filterByGroup(_group.id);
	if (_country)
		_meps = _meps.filterByCountry(_country.id);
	sendTemplate(req, res, tmpl.group, {
		"active_groups": true,
		group: _group,
		groups: _groups,
		country: _country,
		countries: _countries,
		tops: _meps.tops(),
		flops: _meps.flops()
	});
});

app.get(config.prefix + '/topics', function (req, res) {
	sendTemplate(req, res, tmpl.topics, {"active_topics": true})
});
app.get(config.prefix + '/meps', function (req, res) {
	sendTemplate(req, res, tmpl.meps, {"active_meps": true})
});
app.get(config.prefix + '/mail', function (req, res) {
	sendTemplate(req, res, tmpl.mail, {})
});


app.listen(config.port, config.hostname);
console.log('Listen ' + config.hostname + ':' + config.port);
