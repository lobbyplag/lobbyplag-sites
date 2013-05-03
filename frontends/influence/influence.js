#!/usr/bin/env node

/* get confog */
var path = require('path');
var config = require(path.resolve(__dirname, './config.js'));
var global_config = require(path.resolve(__dirname, '../../config.js'));

var fs = require('fs');
var express = require('express');
var locale = require('locale');
var mustache = require('mustache');

/* handle uncaught exception, just in case */
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

/* read templates */
var tmpl = {
	index: fs.readFileSync(__dirname+"/tmpl/index.mustache").toString(),
	header: fs.readFileSync(__dirname+"/../assets/tmpl/header.mustache").toString(),
	footer: fs.readFileSync(__dirname+"/../assets/tmpl/footer.mustache").toString()
}

/* get countries */
var _countries = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "countries.json")).toString());

/* get groups */
var _groups = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "groups.json")).toString());

/* get meps */
var _meps = {};
var _meps = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "mep.json")).toString());
for (_mep_uid in _meps) {
	_meps[_mep_uid].author_name = _meps[_mep_uid].name;
	_meps[_mep_uid].country_title = _countries[_meps[_mep_uid].country];
	_meps[_mep_uid].group_title = _groups[_meps[_mep_uid].group].short;
	_meps[_mep_uid].group_title_long = _groups[_meps[_mep_uid].group].long;
}

/* get lobbyists */
var _lobbyists = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "lobbyists.json")).toString()).forEach(function(_lobbyist){
	_lobbyists[_lobbyist.id] = _lobbyist;
});

/* get documents */
var _documents = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "documents.json")).toString()).forEach(function(_document){
	_document.lobbyist_data = _lobbyists[_document.lobbyist];
	_documents[_document.uid] = _document;
});

/* get amendments */
var _amendments = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "amendments.json")).toString()).forEach(function(_amendment){
	_amendment.author_data = [];
	_amendment.author_ids.forEach(function(author_id){
		_amendment.author_data.push(_meps[author_id]);
	});
	_amendments[_amendment.uid] = _amendment;
});

/* get proposals */
var _proposals = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "proposals.json")).toString()).forEach(function(_proposal){
	_proposal.document = _documents[_proposal.doc_uid] 
	_proposals[_proposal.uid] = _proposal;
});

/* get directive index */
var _locations = {};
var _directive_compiled = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../browse/data/compiled.json")).toString());
for (_directive_id in _directive_compiled) {
	_locations[_directive_id] = _directive_compiled[_directive_id].longtitle.replace(/^Chapter[^,]+, /g,'').replace(/^Section[^,]+, /g,'');
};
delete _directive_compiled;

/* get plags */
var _plags_uid = {};
var _plags = [];
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "plags.json")).toString()).forEach(function(_plag,_idx){
	if (_plag.checked && _plag.verified) {
		_plag.data = {
			"amendment": _amendments[_plag.amendment],
			"proposal": _proposals[_plag.proposal],
		};
		_plag.location = _plag.relations[0];
		_plag.plag_uid = _plag.uid;
		_plag.location_title = _locations[_plag.location];
		_plags.push(_plag);
		_plags_uid[_plag.uid] = _plag;
	}
});

/* sort a bit */
_plags = _plags.sort(function(a, b){
	if (a.data.amendment.committee === b.data.amendment.committee) {
		return (a.data.amendment.number - b.data.amendment.number);
	} else {
		return (a.data.amendment.committee > b.data.amendment.committee) ? -1 : 1;
	}
});

var app = express();

app.configure(function(){
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
});

/* show plags */
app.get('/', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_influence": true,
		"baseurl": config.baseurl,
		"document_url": global_config.document_url,
		"list": {"plags": _plags}
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

/* show special plag */
app.get('/plag/:uid', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_influence": true,
		"baseurl": config.baseurl,
		"document_url": global_config.document_url,
		"plag": _plags_uid[req.params.uid]
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

app.get('*', function(req, res){
	res.status(404);
	res.send("meh.");
	res.end();
});

app.listen(config.port, config.hostname);
console.log('Listen '+config.hostname+':'+config.port);
