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

Array.prototype.flops = function (limit) {
	var limit = 10;
	var result = this.filter(function (o) {
		return ((o.votes.total > 0) && (o.votes.rate < 0));
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
	if (limit)
		return result.slice(0, limit);
	else
		return result;
};

Array.prototype.tops = function (limit) {
	var limit = 10;
	var result = this.filter(function (o) {
		return ((o.votes.total > 0) && (o.votes.rate > 0));
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
	if (limit)
		return result.slice(0, limit);
	else
		return result;
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
		c.tag = c.category.split('-')[0];
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

var articles = [];
function initArticles() {
	articles = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data', 'articles.json')));
	articles.forEach(function (article) {
		article.directive = 'Article ' + article.nr;
		article.classified = article.classified || [];
		classified_data.forEach(function (c) {
			if (c.amend.directive.indexOf(article.directive) >= 0) {
				article.classified.push(c);
			}
		});
		article.overview_meps = {};
		article.classified.forEach(function (c) {
			article.overview_meps[c.vote] = article.overview_meps[c.vote] || [];
			if (c.meps) {
				c.meps.forEach(function (mep) {
					var obj = article.classified.findByID(mep.id);
					if (!obj) {
						obj = {id: mep.id, mep: mep, count: 0 };
						article.overview_meps[c.vote].push(obj);
					}
					obj.count += 1;
				});
			} else {
				console.log(c);
			}
			article.overview_meps[c.vote].sort(function (a, b) {
				if (a.count > b.count)
					return -1;
				if (a.count < b.count)
					return 1;
				return 0;
			});
		});
		article.overview = article.classified.getClassifiedOverview();
		article.group_overview = generateGroupOverview(article.classified, true);
	});
	articles = articles.filter(function (article) {
		return (article.classified) && (article.classified.length > 0);
	});
	articles.sort(function (a, b) {
		if (a.nr < b.nr)
			return -1;
		if (b.nr < a.nr)
			return 1;
		return 0;
	});
	for (var i = 0; i < articles.length; i++) {
		if (i > 0)
			articles[i].prev = {nr: articles[i - 1].nr, title: articles[i - 1].directive};
		if (i < articles.length - 1)
			articles[i].next = {nr: articles[i + 1].nr, title: articles[i + 1].directive};
	}
}
initArticles();


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
	app.use(express.bodyParser());
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
	if (config.debug) {
		app.use(express.logger('dev'));
	} else {
		app.use(express.logger());
	}
});


/* templates */

var reports_filename = path.resolve(__dirname, 'data', "reports.json.txt");
var reports = fs.createWriteStream(reports_filename, {'flags': 'a'});


var send = function (req, res, data) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	if (!config.debug) {
		var oneHour = 3600;
		res.setHeader('Cache-Control', 'public, max-age=' + (oneHour));
	}
	res.send(data);
};

var staticcache = {};

function cache_send(req, res, key) {
	var _data = staticcache[key];
	if (_data) {
		_data.called += 1;
		send(req, res, _data.content);
		return true;
	}
	return false;
}

function storecache(key, content) {
	staticcache[key] = {called: 1, content: content};
}

var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(__dirname + "/../assets/tmpl/header.mustache").toString(),
	footer: fs.readFileSync(__dirname + "/../assets/tmpl/footer.mustache").toString(),

	overview: fs.readFileSync(path.resolve(__dirname, "tmpl/overview.mustache")).toString(),
	country: fs.readFileSync(path.resolve(__dirname, "tmpl/country.mustache")).toString(),
	articles: fs.readFileSync(path.resolve(__dirname, "tmpl/articles.mustache")).toString(),
	article: fs.readFileSync(path.resolve(__dirname, "tmpl/article.mustache")).toString(),
	meps: fs.readFileSync(path.resolve(__dirname, "tmpl/meps.mustache")).toString(),
	group: fs.readFileSync(path.resolve(__dirname, "tmpl/group.mustache")).toString(),
	press: fs.readFileSync(path.resolve(__dirname, "tmpl/press.mustache")).toString(),
	methods: fs.readFileSync(path.resolve(__dirname, "tmpl/methods.mustache")).toString(),
	about: fs.readFileSync(path.resolve(__dirname, "tmpl/about.mustache")).toString(),

	mep_topic_line: fs.readFileSync(path.resolve(__dirname, "tmpl/mep_topic_line.mustache")).toString(),
	countries_map: fs.readFileSync(path.resolve(__dirname, "tmpl/countries_map.mustache")).toString(),
	pie: fs.readFileSync(path.resolve(__dirname, "tmpl/pie.mustache")).toString(),
	group_bars: fs.readFileSync(path.resolve(__dirname, "tmpl/group_bars.mustache")).toString(),
	mep_line: fs.readFileSync(path.resolve(__dirname, "tmpl/mep_line.mustache")).toString(),
	mail: fs.readFileSync(path.resolve(__dirname, "tmpl/mail.mustache")).toString()
};

var fillTemplate = function (template, data) {
	data.active_map = true;
	data.disable_email = true;
	return mustache.render(tmpl.index, data, {
		"main": template,
		"mep_line": tmpl.mep_line,
		"group_bars": tmpl.group_bars,
		"countries_map": tmpl.countries_map,
		"mep_topic_line": tmpl.mep_topic_line,
		"pie": tmpl.pie,
		"header": tmpl.header,
		"footer": tmpl.footer
	})
};

var sendTemplate = function (req, res, template, data) {
	send(req, res, fillTemplate(template, data));
};

function generateGroupOverview(list, hideempty) {
	var _group_overview = [];
	groups.forEach(function (group) {
		var obj = list.filterClassifiedByGroup(group.id).getClassifiedOverview();
		if ((obj.total > 0) || (!hideempty)) {
			delete obj.total;
			delete obj.rate;
			_group_overview.push({
				group: group,
				overview: JSON.stringify(obj)
			})
		}
	});
	return _group_overview;
}

function generateOverviewCountries(_classified, _countries) {
	var _overview_countries = {};
	_countries.forEach(function (country) {
		var obj = _classified.filterClassifiedByCountry(country.id).getClassifiedOverview();
		delete obj.total;
		delete obj.rate;
		_overview_countries[country.iso] = obj;
	});
	return _overview_countries;
}

function sendIndex(req, res) {
	if (!cache_send(req, res, 'index')) {
		var _overview_countries = generateOverviewCountries(classified_data, countries);
		var _data = fillTemplate(tmpl.overview, {
			"active_overview": true,
			overview_countries: JSON.stringify(_overview_countries),
			group_overview: generateGroupOverview(classified_data),
			tops: meps.tops(),
			flops: meps.flops()
		});
		send(req, res, _data);
		storecache('index', _data);
	}
}

app.get(config.prefix, function (req, res) {
	sendIndex(req, res);
});

app.get(config.prefix + '/overview', function (req, res) {
	sendIndex(req, res);
});

function sendCountries(req, res) {
	if (!cache_send(req, res, 'countries')) {
		var _countries = countries.filter(function (country) {
			return meps.hasOneMepWithDataByCountry(country.id);
		});
		var _overview_countries = generateOverviewCountries(classified_data, _countries);
		var _data = fillTemplate(tmpl.country, {
			"active_countries": true,
			countries: _countries,
			tops: meps.tops(),
			flops: meps.flops(),
			overview_countries: JSON.stringify(_overview_countries),
			overview: classified_data.getClassifiedOverview()
		});
		send(req, res, _data);
		storecache('countries', _data);
	}
}

app.get(config.prefix + '/countries', function (req, res) {
	sendCountries(req, res);
});

function sendCountry(_country, req, res) {
	if (!cache_send(req, res, 'country' + _country.id)) {
		var _countries = countries.filter(function (country) {
			return meps.hasOneMepWithDataByCountry(country.id);
		}).map(function (country) {
				return {id: country.id, name: country.name, active: country.id === _country.id};
			});
		var _meps = meps.filterMepsByCountry(_country.id);
		var _overview = classified_data.filterClassifiedByCountry(_country.id);
		var _data = fillTemplate(tmpl.country, {
			"active_countries": true,
			countries: _countries,
			country: _country,
			tops: _meps.tops(),
			flops: _meps.flops(),
			group_overview: generateGroupOverview(_overview),
			overview: _overview.getClassifiedOverview()
		});
		send(req, res, _data);
		storecache('country' + _country.id, _data);
	}
}

function translateISOCountryCode(cc) {
	if (cc === 'gb') {
		return 'uk';
	} else if (cc === 'ie') {
		return 'ir';
	} else {
		return cc;
	}
}

app.get(config.prefix + '/countries/:country', function (req, res) {
	var cc = translateISOCountryCode(req.params.country);
	var _country = countries.findByID(cc);
	if (!_country) {
		sendCountries(req, res);
	} else {
		sendCountry(_country, req, res);
	}
});

function sendGroup(_group, req, res) {
	if (!cache_send(req, res, 'group' + _group.id)) {
		var _groups = groups.map(function (group) {
			return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
		});
		var _countries = countries.map(function (country) {
			return {id: country.id, iso: country.iso, name: country.name, group_id: _group.id};
		});
		var _meps = meps.filterMepsByGroup(_group.id);
		_countries = _countries.filter(function (country) {
			return (_meps.hasOneMepWithDataByCountry(country.id));
		});

		var _classified = classified_data.filterClassifiedByGroup(_group.id);
		var _overview_countries = generateOverviewCountries(_classified, _countries);
		var _data = fillTemplate(tmpl.group, {
			"active_groups": true,
			group: _group,
			groups: _groups,
			countries: _countries,
			tops: _meps.tops(),
			flops: _meps.flops(),
			overview_countries: JSON.stringify(_overview_countries),
			overview: _classified.getClassifiedOverview()
		});
		send(req, res, _data);
		storecache('group' + _group.id, _data);
	}
}

app.get(config.prefix + '/groups', function (req, res) {
	sendGroup(groups[0], req, res)
});

app.get(config.prefix + '/groups/:group', function (req, res) {
	sendGroup(groups.findByID(req.params.group) || groups[0], req, res);
});

function sendGroupCountry(_group, _country, req, res) {
	if (!cache_send(req, res, 'grocou' + _group.id + _country.id)) {
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
		var _data = fillTemplate(tmpl.group, {
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
		send(req, res, _data);
		storecache('grocou' + _group.id + _country.id, _data);
	}
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

function sendMep(_mep, _meps, _message, req, res) {
	var _classified;

	if (_mep) {
		if (cache_send(req, res, 'mep_' + _mep.id)) {
			return;
		}
	} else if ((!_meps) && (!_message)) {
		if (cache_send(req, res, 'meps_base')) {
			return;
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
	var _data = fillTemplate(tmpl.meps, {
		"active_meps": true,
		meps: _meps,
		meps_haschildren: ((_meps) && (_meps.length > 0)),
		mep: _mep,
		message: _message,
		classified: _classified,
		classified_haschildren: ((_classified) && (_classified.length > 0)),
		"typeahead": JSON.stringify(_typeahead)
	});
	send(req, res, _data);
	if (_mep) {
		storecache('mep_' + _mep.id, _data);
	} else if ((!_meps) && (!_message)) {
		storecache('meps_base', _data);
	}
}

app.get(config.prefix + '/meps', function (req, res) {
	var query = url.parse(req.url, true).query;
	var _meps;
	var _mep;
	var _message;
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
	sendMep(_mep, _meps, _message, req, res);
});

app.get(config.prefix + '/meps/:id', function (req, res) {
	var _mep;
	if ((req.params.id) && (req.params.id.length > 0)) {
		_mep = meps.findByID(req.params.id);
	}
	sendMep(_mep, null, null, req, res);
});

function sendArticles(req, res) {
	if (!cache_send(req, res, 'articles')) {
		var _data = fillTemplate(tmpl.articles, {
			active_articles: true,
			articles: articles
		});
		send(req, res, _data);
		storecache('articles', _data);
	}
}

app.get(config.prefix + '/articles', function (req, res) {
	sendArticles(req, res);
});

function sendArticle(req, res, article) {
	if (!cache_send(req, res, 'articles_' + article.nr)) {
		var _data = fillTemplate(tmpl.article, {
			active_articles: true,
			article: article
		});
		send(req, res, _data);
		storecache('articles_' + article.nr, _data);
	}
}

app.get(config.prefix + '/article/:nr', function (req, res) {
	if (req.params.nr) {
		var searchnr = parseInt(req.params.nr);
		for (var i = 0; i < articles.length; i++) {
			if (articles[i].nr === searchnr) {
				sendArticle(req, res, articles[i]);
				return;
			}
		}
	}
	sendArticles(req, res);
});

app.get(config.prefix + '/methods', function (req, res) {
	sendTemplate(req, res, tmpl.methods, {active_methods: true})
});

app.get(config.prefix + '/press', function (req, res) {
	sendTemplate(req, res, tmpl.press, {active_press: true})
});

app.get(config.prefix + '/about', function (req, res) {
	sendTemplate(req, res, tmpl.about, {active_about: true})
});

//app.get(config.prefix + '/mail', function (req, res) {
//	sendTemplate(req, res, tmpl.mail, {})
//});

function getCacheStats() {
	var result = {};
	for (var key in staticcache) {
		result[key] = staticcache[key].called;
	}
	return result;
}

app.get(config.prefix + '/cachestats', function (req, res) {
	res.json(getCacheStats());
});

app.post(config.prefix + '/report', function (req, res) {
	if (!req.body.nr)
		res.send('Error: Missing Report Number!');
	else if ((!req.body.vote) || (['weaker', 'stronger', 'neutral'].indexOf(req.body.vote) < 0))
		res.send('Error: Invalid Rating!');
	else if ((!req.body.comment) || (req.body.comment.trim().length === 0))
		res.send('Error: Please enter a comment.');
	else {
		var _obj = {nr: req.body.nr, vote: req.body.vote, comment: req.body.comment, user: req.body.user, ip: req.headers['HTTP_X_FORWARDED'], date: new Date()};
		reports.write(JSON.stringify(_obj) + ',');
		res.send('Report has been saved. Thank you!');
	}
});

process.on('SIGINT', function () {
	var cachestats_filename = path.resolve(__dirname, 'data', "cachestats" + (new Date()) + ".json");
	fs.writeFileSync(cachestats_filename, JSON.stringify(getCacheStats()));
	process.exit();
});

/* Server */

app.listen(config.port, config.hostname);
console.log('Listen ' + config.hostname + ':' + config.port);
