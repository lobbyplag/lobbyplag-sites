#!/usr/bin/env node

/* get confog */
var path = require('path');
var fs = require('fs');
var express = require('express');
var mustache = require('mustache');

var config = require(path.resolve(__dirname, './config.js'));

/* read template */
var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(path.resolve(__dirname, "../assets/tmpl/header.mustache")).toString(),
	footer: fs.readFileSync(path.resolve(__dirname, "../assets/tmpl/footer.mustache")).toString(),
};

/* get amendments */
var _amendments = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "amendments.json")).toString()).forEach(function(_amendment){
	_amendments[_amendment.uid] = _amendment;
});

/* get proposals */
var _proposals = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "proposals.json")).toString()).forEach(function(_proposal){
	_proposals[_proposal.uid] = _proposal;
});

/* get plags */
var _checkable_plags = [];
var _plag_index = {};
var _plags = JSON.parse(fs.readFileSync(path.resolve(__dirname, config.datadir, "plags.json")).toString());
_plags.forEach(function(_plag,idx){
	_plag_index[_plag.uid] = idx;
	if (_plag.checked === false) _checkable_plags.push(_plag);
});

var save_plags = function(){
	fs.writeFileSync(path.resolve(__dirname, config.datadir, "plags.json"), JSON.stringify(_plags,null,'\t'));
};

var get_plag = function(){
	var _plag = _checkable_plags[Math.floor(Math.random()*_checkable_plags.length)];
	var _data = {
		uid: _plag.uid,
		percent: (_plag.match*100).toFixed(2),
		diffs: {
			amendment: _amendments[_plag.amendment].text[0].diff,
			proposal: _proposals[_plag.proposal].diff
		}
	}
	return _data;
};

/* save data on sigint */
process.on('SIGINT', function() {
	console.log('Caught SIGINT');
	save_plags();
	process.exit();
})

/* handle uncaught exception, just in case */
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

var app = express();

app.configure(function(){
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
	app.use(express.bodyParser());
});

/* get random plag */
app.get('/', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"check": get_plag()
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

/* get random plag */
app.get('/submit', function(req, res){
	res.redirect(config.baseurl+'/');
	res.end();
});

app.post('/submit', function(req, res){
//	console.log(req.body);
	if (req.body['plag-uid'] in _plag_index) {
		var _plag_idx = _plag_index[req.body['plag-uid']];
		if ('submit-no' in req.body) {
			_plags[_plag_idx].processing.checked++;
		} else if ('submit-yes' in req.body) {
			_plags[_plag_idx].processing.checked++;
			_plags[_plag_idx].processing.verified++;
		}
		// console.log(_plags[_plag_idx]);
		save_plags();
	}
	/* redirect */
	res.redirect(config.baseurl+'/');
	res.end();
});

/* get random plag */
app.get('/test', function(req, res){
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.send(JSON.stringify(get_plag(),null,'\t'));
	res.end();
});

app.get('*', function(req, res){
	res.status(404);
	res.send("meh.");
	res.end();
});

app.listen(config.port, config.hostname);

console.log('Listen '+config.hostname+':'+config.port);
