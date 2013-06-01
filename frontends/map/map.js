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
	parties: fs.readFileSync(path.resolve(__dirname, "tmpl/parties.mustache")).toString(),
	topics: fs.readFileSync(path.resolve(__dirname, "tmpl/topics.mustache")).toString(),
	meps: fs.readFileSync(path.resolve(__dirname, "tmpl/meps.mustache")).toString(),
	party: fs.readFileSync(path.resolve(__dirname, "tmpl/party.mustache")).toString(),

	subnav_country: fs.readFileSync(path.resolve(__dirname, "tmpl/subnav_country.mustache")).toString(),
	mail: fs.readFileSync(path.resolve(__dirname, "tmpl/mail.mustache")).toString()
};

var sendTemplate = function (req, res, template, data) {
	data["active_map"] = true;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, data, {
		"main": template,
		"header": tmpl.header,
		"footer": tmpl.footer,
		subnav_country: tmpl.subnav_country  //todo only with corresponding template
	}));
	res.end();
};

var getParty = function (id) {
	return {id: id, name: "mockup"};
};

var getCountry = function (id) {
	for (var i = 0; i < countries.length; i++) {
		if (countries[i].id === id) {
			return      countries[i];
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
		sendTemplate(req, res, tmpl.country, {"active_countries": true, countries: countries, country: _country})
	}
});

app.get(config.prefix + '/parties', function (req, res) {
	sendTemplate(req, res, tmpl.parties, {"active_parties": true});
});
app.get(config.prefix + '/parties/:party', function (req, res) {
	var _party = getParty(req.params.party);
	if (!_party) {
		sendTemplate(req, res, tmpl.parties, {"active_parties": true});
	} else {
		sendTemplate(req, res, tmpl.party, {"active_parties": true, party: _party});
	}
});

app.get(config.prefix + '/parties/:party/:country', function (req, res) {
	var _party = getParty(req.params.party);
	var _country = getCountry(req.params.country);
	if (!_party) {
		sendTemplate(req, res, tmpl.parties, {"active_parties": true});
	} else if (!_country) {
		sendTemplate(req, res, tmpl.party, {"active_parties": true, party: _party});
	} else {
		sendTemplate(req, res, tmpl.party, {"active_parties": true, party: _party, country: _country});
	}
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
