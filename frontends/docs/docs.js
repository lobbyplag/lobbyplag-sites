#!/usr/bin/env node

/* get confog */
var path = require('path');
var config = require(path.resolve(__dirname, './config.js'));

var fs = require('fs');
var express = require('express');
var locale = require('locale');
var mustache = require('mustache');

/* read templates */
var tmpl = {
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
	header: fs.readFileSync(path.resolve(__dirname, "../assets/tmpl/header.mustache")).toString(),
	footer: fs.readFileSync(path.resolve(__dirname, "../assets/tmpl/footer.mustache")).toString()
}

/* read data */
var _data = JSON.parse(fs.readFileSync(path.resolve(__dirname, "data/documents.json")).toString());

/* handle uncaught exception, just in case */
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

var app = express();

app.configure(function(){
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
});

/* show plags */
app.get('/', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_docs": true,
		"documents": _data
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
