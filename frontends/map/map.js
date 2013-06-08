var path = require('path')
	, fs = require('fs')
	, url = require('url')
	, querystring = require("querystring")
	, mustache = require('mustache')
	, express = require('express');

var config = require(path.resolve(__dirname, './config.js'));

Array.prototype.findByUID = function (uid) {
	for (var i = 0; i < this.length; i++) {
		if (this[i].uid === uid) {
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

function Constituencies() {
	var me = this;

	me.initConstituencies = function () {
		var raw_constituencies = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'constituencies.json')));
		for (var key in raw_constituencies) {
			if (raw_constituencies.hasOwnProperty(key)) {
				raw_constituencies[key].forEach(function (_raw_constituency) {
					_raw_constituency.country = key;
					me[_raw_constituency.id] = _raw_constituency;
				});
			}
		}
	};

	return me;
}

function CountryList(value) {
	var me = value || [];

	me.initCountries = function () {
		var raw_countries = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'countries.json')));
		for (var key in raw_countries) {
			if (raw_countries.hasOwnProperty(key)) {
				var country = {id: key, name: raw_countries[key], thename: raw_countries[key], iso: key}
				if ((country.id === 'uk') || (country.id === 'nl')) {
					country.thename = 'the ' + country.name;
				}
				if (country.iso === 'uk') {
					country.iso = 'gb';
				} else if (country.iso === 'ir') {
					country.iso = 'ie';
				}
				me.push(country);
			}
		}
	};

	return me;
}

function GroupList(value) {
	var me = value || [];

	me.initGroups = function () {
		var raw_groups = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'groups.json')));
		for (var key in raw_groups) {
			if (raw_groups.hasOwnProperty(key)) {
				raw_groups[key].id = key;
				me.push(raw_groups[key]);
			}
		}
	};

	return me;
}

function MEPList(value) {
	var me = value || [];

	me.initMEPs = function (classified, countries, groups, constituencies) {
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
			_mep.votes = new Overview();
			classified.forEach(function (c) {
				if (c.user === 'MS') {
					c.amend.author_ids.forEach(function (autor) {
						if (autor === _mep.id) {
							_mep.votes.addVote(c.vote);
						}
					});
				}
			});
			_mep.classified = classified.filter(function (c) {
				return c.amend.author_ids.indexOf(_mep.id) >= 0;
			}).sort(function (a, b) {
					if (a.amend.number < b.amend.number)
						return -1;
					if (a.amend.number > b.amend.number)
						return 1;
					return 0;
				});
			me.push(_mep);
		}
	};

	me.filterMepsByGroup = function (group_id) {
		return MEPList(me.filter(function (mep) {
			return mep.group === group_id;
		}));
	};

	me.filterMepsByCountry = function (country_id) {
		return MEPList(me.filter(function (mep) {
			return mep.country === country_id;
		}));
	};

	me.filterMepsByGroupAndCountry = function (group_id, country_id) {
		return MEPList(me.filter(function (mep) {
			return ((mep.country === country_id) && (mep.group === group_id));
		}));
	};

	me.hasOneMepWithDataByCountry = function (country_id) {
		for (var i = 0; i < me.length; i++) {
			if ((me[i].votes.getTotal() > 0) && (me[i].country === country_id)) {
				return true;
			}
		}
		return false;
	};

	me.flops = function (limit) {
		var limit = 10;
		var result = me.filter(function (o) {
			return ((o.votes.getTotal() > 0) && (o.votes.getRate() < 0));
		});
		result.sort(function (a, b) {
			if (a.votes.getRate() < b.votes.getRate())
				return -1;
			if (a.votes.getRate() > b.votes.getRate())
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
			return MEPList(result.slice(0, limit));
		else
			return MEPList(result);
	};

	me.tops = function (limit) {
		var limit = 10;
		var result = me.filter(function (o) {
			return ((o.votes.getTotal() > 0) && (o.votes.getRate() > 0));
		});
		result.sort(function (a, b) {
			if (a.votes.getRate() < b.votes.getRate())
				return 1;
			if (a.votes.getRate() > b.votes.getRate())
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
			return MEPList(result.slice(0, limit));
		else
			return MEPList(result);
	};

	me.searchMeps = function (search) {
		search = search.toLowerCase();
		return MEPList(lpdata.meps.filter(function (mep) {
			return mep.name.toLowerCase().indexOf(search) >= 0;
		}));
	};

	return me;
}

function Overview() {
	this.pro = 0;
	this.contra = 0;
	this.neutral = 0;
	this.addVote = function (vote) {
		if (vote === "neutral")
			this.neutral += 1;
		else if (vote === "weaker")
			this.contra += 1;
		else if (vote === "stronger")
			this.pro += 1;
	};
	this.getRate = function () {
		return this.pro - this.contra;
	};
	this.getTotal = function () {
		return this.pro + this.contra + this.neutral;
	};
	return this;
}

function GroupOverList(value) {
	var me = value || [];
	me.addGroupOverview = function (group, overview, localparties) {
		me.push({group: group, overview: overview, localparties: localparties});
	};
	return me;
}

function ClassifyList(value) {
	var me = value || [];

	me.initClassified = function () {
		var raw_amendments = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, 'amendments.json')));
		var raw_classified = JSON.parse(fs.readFileSync(path.resolve(__dirname, './data', 'classified.json')));
		raw_classified = raw_classified.filter(function (c) {
			return c.user === 'MS';
		});
		raw_classified.forEach(function (c) {
			c.amend = raw_amendments.findByUID(c.uid);
			c.amend.diff = c.amend.text[0].diff;
			c.tag = c.category.split('-')[0];
			if ((!c.amend.relations) || (!c.amend.relations[0]))
				console.log('Missing Amendment Relation to Directive: ' + c.uid);
			else
				c.amend.directive = c.amend.relations[0].expand();
			me.push(c);
		});
		me.sortByAmendNr();
		me.fillNavigs();
	};

	me.findByAmendNr = function (nr) {
		nr = parseInt(nr);
		for (var i = 0; i < me.length; i++) {
			if (me[i].amend.number === nr)
				return me[i];
		}
		return null;
	};

	me.fillNavigs = function () {
		me.forEach(function (c) {
			c.next = null;
			c.prev = null;
			for (var i = c.amend.number + 1; i < 5000; i++) {
				if (me.findByAmendNr(i)) {
					c.next = {nr: i, title: 'LIBE#' + i};
					break;
				}
			}
			for (var i = c.amend.number - 1; i > 0; i--) {
				if (me.findByAmendNr(i)) {
					c.prev = {nr: i, title: 'LIBE#' + i};
					break;
				}
			}
		})

	};

	me.sortByAmendNr = function () {
		me.sort(function (a, b) {
			if (a.amend.number < b.amend.number)
				return -1;
			if (a.amend.number > b.amend.number)
				return 1;
			return 0;
		});
	};

	me.updateClassifiedWithMeps = function (meps) {
		me.forEach(function (c) {
			c.meps = MEPList(meps.filter(function (mep) {
				return c.amend.author_ids.indexOf(mep.id) >= 0;
			}));
			if (c.meps.length === 0) {
				console.log('Amendment without Authors ' + c.uid);
			}
		});
	};

	me.getClassifiedOverview = function () {
		var result = new Overview();
		me.forEach(function (c) {
			result.addVote(c.vote);
		});
		return result;
	};

	me.filterClassifiedByGroupAndCountry = function (group_id, country_id) {
		return ClassifyList(me.filter(function (c) {
			for (var i = 0; i < c.meps.length; i++) {
				if ((c.meps[i].group === group_id) && (c.meps[i].country === country_id)) {
					return true;
				}
			}
			return false;
		}));
	};

	me.filterClassifiedByGroup = function (group_id) {
		return ClassifyList(me.filter(function (c) {
			for (var i = 0; i < c.meps.length; i++) {
				if (c.meps[i].group === group_id) {
					return true;
				}
			}
			return false;
		}));
	};

	me.filterClassifiedByCountry = function (country_id) {
		return ClassifyList(this.filter(function (c) {
			for (var i = 0; i < c.meps.length; i++) {
				if (c.meps[i].country === country_id)
					return true;
			}
			return false;
		}));
	};

	me.filterClassifiedByLocal = function (con_id) {
		return ClassifyList(this.filter(function (c) {
			for (var i = 0; i < c.meps.length; i++) {
				if (c.meps[i].constituency === con_id)
					return true;
			}
			return false;
		}));
	};

	return me;
}

function ArticleList(value) {
	var me = value || [];

	me.initArticles = function (classified, groups) {
		var _articles = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data', 'articles.json')));
		_articles.forEach(function (article) {
			article.directive = 'Article ' + article.nr;
			article.classified = article.classified || ClassifyList();
			classified.forEach(function (c) {
				var test = c.amend.directive.split(' – ')[0].split('+')[0];
				if (test === article.directive) {
					article.classified.push(c);
				}
			});
			article.overview_meps = {};

			article.classified.forEach(function (c) {
				article.overview_meps[c.vote] = article.overview_meps[c.vote] || [];
				if (c.meps) {
					c.meps.forEach(function (mep) {
						var obj = article.overview_meps[c.vote].findByID(mep.id);
						if (!obj) {
							obj = {id: mep.id, mep: mep, count: 0 };
							article.overview_meps[c.vote].push(obj);
						}
						obj.amend_nrs = obj.amend_nrs || [];
						obj.amend_nrs.push(c.amend.number);
						obj.count += 1;
					});
				} else {
					console.log('Error 1');
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
			article.group_overview = GroupOverList();
			groups.forEach(function (group) {
				article.group_overview.addGroupOverview(
					group, article.classified.filterClassifiedByGroup(group.id).getClassifiedOverview
				)
			});
			if (article.classified.length > 0)
				me.push(article);
		});
		_articles = _articles.filter(function (article) {
			return (article.classified) && (article.classified.length > 0);
		});
		_articles.sort(function (a, b) {
			if (a.nr < b.nr)
				return -1;
			if (b.nr < a.nr)
				return 1;
			return 0;
		});
		for (var i = 0; i < _articles.length; i++) {
			if (i > 0)
				_articles[i].prev = {nr: _articles[i - 1].nr, title: _articles[i - 1].directive};
			if (i < _articles.length - 1)
				_articles[i].next = {nr: _articles[i + 1].nr, title: _articles[i + 1].directive};
		}
	};

	me.findArticleByNr = function (searchnr) {
		for (var i = 0; i < me.length; i++) {
			if (me[i].nr === searchnr) {
				return me[i];
			}
		}
		return null;
	};

	return me;
}

var Utils = function () {

	this.compileMailParameter = function (_country, _groups, _ia, _gov) {
		var params = {};
		if (_country)
			params.country = _country.name;
		if (_groups) {
			params.party = _groups.map(function (group) {
				return group.short;
			}).join(',');
		}
		if (_ia) {
			params.ia = 1;
		}
		if (_gov) {
			params.gov = 1;
		}
		params.lang = 'en';
		//- pos: [Format: "{a}-{b}"] - a,b signed Integer, a <= b; wird ignoriert, wenn falsches format oder a>b; gecapped mit min(pos(abgeordneter)) bzw. max(pos(abgeordneter))
		return '?' + querystring.stringify(params);
	};

	this.translateISOCountryCode = function (cc) {
		if (cc === 'gb') {
			return 'uk';
		} else if (cc === 'ie') {
			return 'ir';
		} else {
			return cc;
		}
	};

	this.generateOverviewCountries = function (_classified, _countries, _group) {
		var _overview_countries = {};
		_countries.forEach(function (country) {
			if (_group) {
				_overview_countries[country.iso] = _classified.filterClassifiedByGroupAndCountry(_group.id, country.id).getClassifiedOverview();
			} else {
				_overview_countries[country.iso] = _classified.filterClassifiedByCountry(country.id).getClassifiedOverview();
			}
		});
		return _overview_countries;
	};
	return this;
};

var LPData = function () {
	var me = this;
	me.constituencies = new Constituencies();
	me.classified = ClassifyList();
	me.countries = CountryList();
	me.groups = GroupList();
	me.articles = ArticleList();
	me.meps = MEPList();
	me.typeahead = '';
	me.europe = {};

	me.getGroupMenu = function (_group, _country) {
		var _menu_groups = me.groups.map(function (group) {
			return {id: group.id, short: group.short, long: group.long, active: (group.id === _group.id)};
		});
		var _menu_meps = me.meps.filterMepsByGroup(_group.id);
		var _menu_countries = me.countries.map(function (country) {
			return {
				id: country.id,
				name: country.name,
				group_id: _group.id,
				active: ((_country) && (country.id === _country.id)
					)};
		}).filter(function (country) {
				return (_menu_meps.hasOneMepWithDataByCountry(country.id));
			});
		return {groups: _menu_groups, countries: _menu_countries, group: _group, country: _country};
	};
	me.getLocalParties = function (_group, _country) {
		var _constituencies = [];
		var _constituenciesdone = {};
		var _overview = me.classified.filterClassifiedByGroupAndCountry(_group.id, _country.id);
		_overview.forEach(function (c) {
			c.meps.forEach(function (mep) {
				if ((mep.country === _country.id) && (mep.group === _group.id)) {
					if (!me.constituencies[mep.constituency]) {
						if (mep.constituency)
							console.log('Missing constituency: ' + mep.constituency);
					} else if (!_constituenciesdone[mep.constituency]) {
						_constituenciesdone[mep.constituency] = true;
						_constituencies.push(me.constituencies[mep.constituency]);
					}
				}
			});
		});
		return _constituencies;
	};

	function init() {
		//order is important !
		me.classified.initClassified();
		me.constituencies.initConstituencies();
		me.countries.initCountries();
		me.groups.initGroups();
		me.meps.initMEPs(me.classified, me.countries, me.groups, me.constituencies);
		me.classified.updateClassifiedWithMeps(me.meps);
		me.articles.initArticles(me.classified, me.groups);

		me.europe = {
			overview: me.classified.getClassifiedOverview(),
			groups_overviews: GroupOverList(),
			tops: me.meps.tops(10),
			flops: me.meps.flops(10),
			overview_countries: JSON.stringify(utils.generateOverviewCountries(me.classified, me.countries))
		};
		me.europe.menu_countries = me.countries.filter(function (country) {
			return me.meps.hasOneMepWithDataByCountry(country.id);
		});
		me.typeahead = JSON.stringify(me.meps.map(function (mep) {
			return mep.name;
		}));
		me.groups.forEach(function (group) {
			var _list = me.classified.filterClassifiedByGroup(group.id);
			var _meps = me.meps.filterMepsByGroup(group.id);
			group.overview = _list.getClassifiedOverview();
			group.overview_countries = JSON.stringify(utils.generateOverviewCountries(_list, me.countries, group));
			group.maildata = utils.compileMailParameter(null, [group]);
			group.tops = _meps.tops(10);
			group.flops = _meps.flops(10);
			group.meps = _meps;
			group.groupcountries = {};
			group.menu = me.getGroupMenu(group, null);
			me.europe.groups_overviews.addGroupOverview(group, group.overview);
			me.countries.forEach(function (country) {
				var _country_list = me.classified.filterClassifiedByGroupAndCountry(group.id, country.id);
				var _country_meps = me.meps.filterMepsByGroupAndCountry(group.id, country.id);
				var _groupcountry = {
					group: group,
					country: country,
					local_overviews: GroupOverList(),
					maildata: utils.compileMailParameter(country, [group]),
					localparties: me.getLocalParties(group, country).map(function (con) {
						return con.short;
					}).join(', '),
					overview: _country_list.getClassifiedOverview(),
					tops: _country_meps.tops(),
					flops: _country_meps.flops(),
					menu: me.getGroupMenu(group, country)
				};
				var _locals = me.getLocalParties(group, country);
				_locals.filter(function (con) {
					return con.group = group.id;
				}).forEach(
					function (con) {
						var _obj = me.classified.filterClassifiedByLocal(con.id).getClassifiedOverview();
						_groupcountry.local_overviews.addGroupOverview(group, _obj, [con]);
					});
				group.groupcountries[country.id] = _groupcountry;
			});
		});
		me.countries.forEach(function (country) {
			var _list = me.classified.filterClassifiedByCountry(country.id);
			country.overview = _list.getClassifiedOverview();
			country.groups_overviews = GroupOverList();
			country.local_overviews = GroupOverList();
			country.maildata = utils.compileMailParameter(country);
			var _meps = me.meps.filterMepsByCountry(country.id);
			country.tops = _meps.tops(10);
			country.flops = _meps.flops(10);
			country.menu_countries = me.countries.filter(function (_country) {
				return me.meps.hasOneMepWithDataByCountry(_country.id);
			}).map(function (_country) {
					return {id: _country.id, name: _country.name, active: _country.id === country.id};
				});
			me.groups.forEach(function (group) {
				var _locals = me.getLocalParties(group, country);
				if (group.groupcountries[country.id].overview.getTotal() > 0) {
					country.groups_overviews.addGroupOverview(group, group.groupcountries[country.id].overview, _locals);
				}
				_locals.forEach(function (con) {
					var _obj = me.classified.filterClassifiedByLocal(con.id).getClassifiedOverview();
					country.local_overviews.addGroupOverview(group, _obj, [con]);
				});
			});
		});
	}

	init();
	return me;
};


/* configure Express */

var app = express();
var utils = new Utils();
var lpdata = new LPData();

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

/* sending & cache */

var send = function (req, res, data) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	if (!config.debug) {
		var oneHour = 3600;
		res.setHeader('Cache-Control', 'public, max-age=' + (oneHour));
	}
	res.send(data);
};

var cache = {};

function cache_send(req, res, key) {
	var _data = cache[key];
	if (_data) {
		_data.called += 1;
		send(req, res, _data.content);
		return true;
	}
	return false;
}

function cache_store(key, content) {
	cache[key] = {called: 1, content: content};
}

/* templates */

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
	mailtest: fs.readFileSync(path.resolve(__dirname, "tmpl/mailtest.mustache")).toString(),
	discuss: fs.readFileSync(path.resolve(__dirname, "tmpl/discuss.mustache")).toString(),
	amends: fs.readFileSync(path.resolve(__dirname, "tmpl/amends.mustache")).toString(),

	partial_amend_overview_text: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_amend_overview_text.mustache")).toString(),
	partial_article_mep: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_article_mep.mustache")).toString(),
	partial_map: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_map.mustache")).toString(),
	partial_pie: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_pie.mustache")).toString(),
	partial_group_bar: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_group_bar.mustache")).toString(),
	partial_group_bar_local: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_group_bar_local.mustache")).toString(),
	partial_mep_line: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_mep_line.mustache")).toString()
};

var fillTemplate = function (template, _data) {
	_data.active_map = true;
	_data.disable_email = true;
	_data.data = lpdata;
	return mustache.render(tmpl.index, _data, {
		main: template,
		partial_mep_line: tmpl.partial_mep_line,
		partial_group_bar: tmpl.partial_group_bar,
		partial_map: tmpl.partial_map,
		partial_article_mep: tmpl.partial_article_mep,
		partial_amend_overview_text: tmpl.partial_amend_overview_text,
		partial_group_bar_local: tmpl.partial_group_bar_local,
		partial_pie: tmpl.partial_pie,
		"header": tmpl.header,
		"footer": tmpl.footer
	})
};

var sendTemplate = function (req, res, template, data) {
	send(req, res, fillTemplate(template, data));
};

/* index */

function sendIndex(req, res) {
	if (cache_send(req, res, 'index'))
		return;
	var _data = fillTemplate(tmpl.overview, {active_overview: true});
	send(req, res, _data);
	cache_store('index', _data);
}

app.get(config.prefix, function (req, res) {
	sendIndex(req, res);
});

app.get(config.prefix + '/overview', function (req, res) {
	sendIndex(req, res);
});

/* countries */

function sendCountries(req, res) {
	if (cache_send(req, res, 'countries'))
		return;
	var _data = fillTemplate(tmpl.country, {
		active_countries: true,
		menu_countries: lpdata.europe.menu_countries,
		title: 'Countries'
	});
	send(req, res, _data);
	cache_store('countries', _data);
}

function sendCountry(req, res, country) {
	if (cache_send(req, res, 'country_' + country.id))
		return;
	var _data = fillTemplate(tmpl.country, {
		active_countries: true,
		menu_countries: country.menu_countries,
		country: country,
		title: country.name
	});
	send(req, res, _data);
	cache_store('country_' + country.id, _data);
}

app.get(config.prefix + '/countries', function (req, res) {
	sendCountries(req, res);
});

app.get(config.prefix + '/countries/:country', function (req, res) {
	var cc = utils.translateISOCountryCode(req.params.country);
	var _country = lpdata.countries.findByID(cc);
	if (!_country) {
		sendCountries(req, res);
	} else {
		sendCountry(req, res, _country);
	}
});

/* groups */

function sendGroup(req, res, group) {
	if (cache_send(req, res, 'group' + group.id))
		return;
	var _data = fillTemplate(tmpl.group, {
		active_groups: true,
		menu: group.menu,
		title: group.short,
		group: group
	});
	send(req, res, _data);
	cache_store('group' + group.id, _data);
}

function sendGroupCountry(req, res, group, country) {
	if (cache_send(req, res, 'gc_' + group.id + country.id))
		return;
	var _groupcountry = group.groupcountries[country.id];
	var _data = fillTemplate(tmpl.group, {
		active_groups: true,
		menu: _groupcountry.menu,
		title: group.short + ' in ' + country.thename,
		group: group,
		countrygroup: _groupcountry
	});
	send(req, res, _data);
	cache_store('gc_' + group.id + country.id, _data);
}

app.get(config.prefix + '/groups', function (req, res) {
	sendGroup(req, res, lpdata.groups[0])
});

app.get(config.prefix + '/groups/:group', function (req, res) {
	sendGroup(req, res,
		lpdata.groups.findByID(req.params.group) || lpdata.groups[0]
	);
});

app.get(config.prefix + '/groups/:group/:country', function (req, res) {
	var _group = lpdata.groups.findByID(req.params.group) || lpdata.groups[0];
	var _country = lpdata.countries.findByID(req.params.country);
	if (!_country) {
		sendGroup(req, res, _group);
	} else {
		sendGroupCountry(req, res, _group, _country);
	}
});

/* meps */

function sendMep(req, res, mep) {
	if (cache_send(req, res, 'mep_' + mep.id))
		return;
	var _data = fillTemplate(tmpl.meps, {
		active_meps: true,
		mep: mep,
		title: mep.name
	});
	send(req, res, _data);
	cache_store('mep_' + mep.id, _data);
}

function sendMepEmpty(req, res, searchterm) {
	if (cache_send(req, res, 'meps_base'))
		return;
	var _data = fillTemplate(tmpl.meps, {
		active_meps: true,
		title: 'MEPs',
		searchterm: searchterm
	});
	send(req, res, _data);
	cache_store('meps_base', _data);
}

function sendMeps(req, res, meps) {
	var _data = fillTemplate(tmpl.meps, {
		active_meps: true,
		meps: meps,
		title: 'MEPs'
	});
	send(req, res, _data);
}

app.get(config.prefix + '/meps', function (req, res) {
	var query = url.parse(req.url, true).query;
	if ((query.q) && (query.q.length > 0)) {
		var _meps = lpdata.meps.searchMeps(query.q);
		if (_meps.length === 1) {
			sendMep(req, res, _meps[0]);
		} else if (_meps.length === 0) {
			sendMepEmpty(req, res, query.q);
		} else {
			sendMeps(req, res, _meps);
		}
	} else if ((query.id) && (query.id.length > 0)) {
		var _mep = lpdata.meps.findByID(query.id);
		if (_mep) {
			sendMep(req, res, _mep);
		} else {
			sendMepEmpty(req, res, query.id);
		}
	} else {
		sendMepEmpty(req, res);
	}
});

app.get(config.prefix + '/meps/:id', function (req, res) {
	var _mep;
	if ((req.params.id) && (req.params.id.length > 0)) {
		_mep = lpdata.meps.findByID(req.params.id);
	}
	if (_mep)
		sendMep(req, res, _mep)
	else
		sendMepEmpty(req, res)
});

/* articles */

function sendArticles(req, res) {
	if (cache_send(req, res, 'articles'))
		return;
	var _data = fillTemplate(tmpl.articles, {
		active_articles: true,
		title: 'Articles'
	});
	send(req, res, _data);
	cache_store('articles', _data);
}

function sendArticle(req, res, article) {
	if (cache_send(req, res, 'articles_' + article.nr))
		return;
	var _data = fillTemplate(tmpl.article, {
		active_articles: true,
		article: article,
		title: 'Article ' + article.nr
	});
	send(req, res, _data);
	cache_store('articles_' + article.nr, _data);
}

app.get(config.prefix + '/articles', function (req, res) {
	sendArticles(req, res);
});

app.get(config.prefix + '/article/:nr', function (req, res) {
	if (req.params.nr) {
		var searchnr = parseInt(req.params.nr);
		var _article = lpdata.articles.findArticleByNr(searchnr);
		if (_article) {
			sendArticle(req, res, _article);
			return;
		}
	}
	sendArticles(req, res);
});

/* amendments */

function sendAmend(req, res, _classified) {
	if (cache_send(req, res, 'amend_' + _classified.amend.number))
		return;
	var _data = fillTemplate(tmpl.discuss, {
		active_amends: true,
		classified: _classified,
		title: 'LIBE#' + _classified.amend.number
	});
	send(req, res, _data);
	cache_store('amend_' + _classified.amend.number, _data);
}

function sendAmendments(req, res) {
	if (cache_send(req, res, 'amends_libe'))
		return;
	var _data = fillTemplate(tmpl.amends, {
		active_amends: true,
		title: 'LIBE Amendments'
	});
	send(req, res, _data);
	cache_store('amends_libe', _data);
}

app.get(config.prefix + '/discuss/libe/:nr', function (req, res) {
	var _classified = lpdata.classified.findByAmendNr(req.params.nr);
	if (_classified) {
		sendAmend(req, res, _classified);
	} else {
		res.redirect(config.prefix);
	}
});

app.get(config.prefix + '/amendments/libe/', function (req, res) {
	sendAmendments(req, res);
});

/* text sites */

app.get(config.prefix + '/methods', function (req, res) {
	sendTemplate(req, res, tmpl.methods, {active_methods: true, title: 'Methods'})
});

app.get(config.prefix + '/press', function (req, res) {
	sendTemplate(req, res, tmpl.press, {active_press: true, title: 'Press'})
});

app.get(config.prefix + '/about', function (req, res) {
	sendTemplate(req, res, tmpl.about, {active_about: true, title: 'About'})
});

/* debug sites */

app.get(config.prefix + '/mailtest', function (req, res) {
	var params = [];
	lpdata.countries.forEach(function (county) {
		params.push(utils.compileMailParameter(county));
	});
	lpdata.groups.forEach(function (group) {
		params.push(utils.compileMailParameter(null, [group]));
	});
	params.push(utils.compileMailParameter(null, lpdata.groups));
	sendTemplate(req, res, tmpl.mailtest, {params: params});
});

/*

 var reports_filename = path.resolve(__dirname, 'data', "reports.json.txt");
 var reports = fs.createWriteStream(reports_filename, {'flags': 'a'});

 app.post(config.prefix + '/report', function (req, res) {
 if (!req.body.nr)
 res.send('Error: Missing Report Number!');
 else if ((!req.body.vote) || (['weaker', 'stronger', 'neutral'].indexOf(req.body.vote) < 0))
 res.send('Error: Invalid Rating!');
 else if ((!req.body.comment) || (req.body.comment.trim().length === 0))
 res.send('Error: Please enter a comment.');
 else {
 var _obj = {nr: req.body.nr, vote: req.body.vote, comment: req.body.comment, user: req.body.user, date: new Date()};
 reports.write(JSON.stringify(_obj) + ',');
 res.send('Report has been saved. Thank you!');
 }
 });

 function cvsify(s) {
 s = s || '';
 if (s.indexOf(';') >= 0) {
 s = '"' + s.replace('"', '""') + '"';
 }
 return s.replace("\n", ' ');
 }
 app.get(config.prefix + '/reportsfromtheuserssecretcsv', function (req, res) {
 try {
 var _reports = JSON.parse('[' +
 fs.readFileSync(path.resolve(__dirname, 'data', 'reports.json.txt'))
 + '{}]');
 var _lines = ["NR;VOTE;USER;DATE;COMMENT"];
 _reports.forEach(function (report) {
 if (report.nr)
 _lines.push(
 cvsify(report.nr) + ';' + cvsify(report.vote) + ';' + cvsify(report.user) + ';' + cvsify(report.date) + ';' + cvsify(report.comment)
 )
 });
 res.setHeader('Content-Type', 'text/cvs; charset=utf-8');
 res.send(_lines.join("\n"));
 } catch (e) {
 console.log(e);
 res.send('error :.-(');
 }
 });
 */

/* Server */

app.listen(config.port, config.hostname);
console.log('Listen ' + config.hostname + ':' + config.port);
