var path = require('path')
	, fs = require('fs')
	, mustache = require('mustache')
	, express = require('express');

var config = require(path.resolve(__dirname, './config.js'));

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
	groups.push(
		{id: key, short: raw_groups[key].short, long: raw_groups[key].long}
	);
}

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
	countries: fs.readFileSync(path.resolve(__dirname, "tmpl/countries.mustache")).toString(),
	country: fs.readFileSync(path.resolve(__dirname, "tmpl/country.mustache")).toString(),
	topics: fs.readFileSync(path.resolve(__dirname, "tmpl/topics.mustache")).toString(),
	meps: fs.readFileSync(path.resolve(__dirname, "tmpl/meps.mustache")).toString(),
	party: fs.readFileSync(path.resolve(__dirname, "tmpl/party.mustache")).toString(),

	mail: fs.readFileSync(path.resolve(__dirname, "tmpl/mail.mustache")).toString()
};

var sendTemplate = function (req, res, template, data) {
	data["active_map"] = true;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, data, {
		"main": template,
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
};

var getParty = function (id) {
	for (var i = 0; i < groups.length; i++) {
		if (groups[i].id === id) {
			return groups[i];
		}
	}
	return null;
};

var getCountry = function (id) {
	for (var i = 0; i < countries.length; i++) {
		if (countries[i].id === id) {
			return countries[i];
		}
	}
	return null;
};

/* index */
app.get(config.prefix, function (req, res) {
	sendTemplate(req, res, tmpl.overview, {"active_overview": true})
});
app.get(config.prefix + '/overview', function (req, res) {
	sendTemplate(req, res, tmpl.overview, {"active_overview": true})
});
app.get(config.prefix + '/countries', function (req, res) {
	sendTemplate(req, res, tmpl.countries, {"active_countries": true, countries: countries})
});
app.get(config.prefix + '/countries/:country', function (req, res) {
	console.log(req.params.country);
	var _country = getCountry(req.params.country);
	if (!_country) {
		sendTemplate(req, res, tmpl.countries, {"active_countries": true, countries: countries})
	} else {
		var _countries = countries.map(function (country) {
			return {id: country.id, name: country.name, active: country.id === _country.id};
		});
		sendTemplate(req, res, tmpl.country, {"active_countries": true, countries: _countries, country: _country})
	}
});

app.get(config.prefix + '/parties', function (req, res) {
	var _party = groups[0];
	var _parties = groups.map(function (party) {
		return {id: party.id, short: party.short, long: party.long, active: (party.id === _party.id)};
	});
	var _countries = countries.map(function (country) {
		return {id: country.id, name: country.name, party_id: _party.id};
	});
	sendTemplate(req, res, tmpl.party, {"active_parties": true, party: _party, parties: _parties, countries: _countries});
});
app.get(config.prefix + '/parties/:party', function (req, res) {
	var _party = getParty(req.params.party) || groups[0];
	var _parties = groups.map(function (party) {
		return {id: party.id, short: party.short, long: party.long, active: (party.id === _party.id)};
	});
	var _countries = countries.map(function (country) {
		return {id: country.id, name: country.name, party_id: _party.id};
	});
	sendTemplate(req, res, tmpl.party, {"active_parties": true, party: _party, parties: _parties, countries: _countries});
});

app.get(config.prefix + '/parties/:party/:country', function (req, res) {
	var _party = getParty(req.params.party) || groups[0];
	var _country = getCountry(req.params.country);
	var _parties = groups.map(function (party) {
		return {id: party.id, short: party.short, long: party.long, active: (party.id === _party.id)};
	});
	var _countries = countries.map(function (country) {
		return {id: country.id, name: country.name, party_id: _party.id, active: ((_country) && (country.id === _country.id))};
	});
	sendTemplate(req, res, tmpl.party, {"active_parties": true, party: _party, parties: _parties, country: _country, countries: _countries});
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
