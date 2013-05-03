#!/usr/bin/env node

/* get confog */
var path = require('path');
var config = require(path.resolve(__dirname, './config.js'));

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

var app = express();

app.configure(function(){
	app.use("/assets", express.static(path.resolve(__dirname, '../assets')));
});

/* show welcome */
app.get('/', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_welcome": true,
		"welcome": true,
		"baseurl": config.baseurl
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

app.get('/sources', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_sources": true,
		"sources": true,
		"baseurl": config.baseurl
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

app.get('/get-involved', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_get_involved": true,
		"get_involved": true,
		"baseurl": config.baseurl
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

app.get('/support-us', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_support_us": true,
		"support_us": true,
		"baseurl": config.baseurl
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	}));
	res.end();
});

app.get('/blog', function(req, res){
	res.redirect('http://blog.lobbyplag.eu/');
	res.end();
});


app.get('*', function(req, res){
	res.status(404);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.send("404");
	res.end();
});

app.listen(config.port, config.hostname);
console.log('Listen '+config.hostname+':'+config.port);
