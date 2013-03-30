#!/usr/bin/env node

/* get confog */
var config = require('./config');

var fs = require('fs');
var express = require('express');
var locale = require('locale');
var mustache = require('mustache');

/*set default locale */
locale.Locale["default"] = config.locale_default;

/* read templates */
var tmpl = {
	index: fs.readFileSync(__dirname+"/assets/tmpl/index.mustache").toString(),
	directive: fs.readFileSync(__dirname+"/assets/tmpl/directive.mustache").toString(),
	mep: fs.readFileSync(__dirname+"/assets/tmpl/mep.mustache").toString(),
	indicator: fs.readFileSync(__dirname+"/assets/tmpl/indicator.mustache").toString(),
	list: fs.readFileSync(__dirname+"/assets/tmpl/list.mustache").toString()
}

var data = JSON.parse(fs.readFileSync(__dirname+"/assets/data/compiled.json").toString());

/* handle uncaught exception, just in case */
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

var app = express();

app.configure(function(){
	app.use("/assets", express.static(__dirname + '/assets'));
	app.use(locale(config.locales));
});

/* show listing */
app.get('/', function(req, res){
	res.setHeader('Content-Type', 'text-html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {},{
		"main": tmpl.list,
		"indicator": tmpl.indicator
	}));
	res.end();
});

/* display directive */
app.get('/show/:directive', function(req, res){	
	res.setHeader('Content-Type', 'text-html; charset=utf-8');
	
	if (!(req.params.directive in data)) {
		res.redirect(301, '/');
		res.end();
		return;
	}
	
	res.send(mustache.render(tmpl.index, {
		"directive": data[req.params.directive]
	},{
		"main": tmpl.directive,
		"indicator": tmpl.indicator,
		"mep": tmpl.mep
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
