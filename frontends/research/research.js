#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var http = require('http');
var express = require('express');
var mustache = require('mustache');
var colors = require('colors');
var querystring = require('querystring');
var plaque = require(path.resolve(__dirname, "lib/plaque"));

/* get confog */
var config = require(path.resolve(__dirname, 'config.js'));

/* get templates */
var tmpl = {
	index: fs.readFileSync(__dirname+"/tmpl/index.mustache").toString(),
	result: fs.readFileSync(__dirname+"/tmpl/result.mustache").toString(),
	header: fs.readFileSync(__dirname+"/../assets/tmpl/header.mustache").toString(),
	footer: fs.readFileSync(__dirname+"/../assets/tmpl/footer.mustache").toString()
};

var index_parse = function(data, q) {
	return mustache.render(tmpl.index, {
		"active_research": true,
		"content": mustache.render(tmpl.result, data),
		"q": q
	},{
		"header": tmpl.header,
		"footer": tmpl.footer
	});
};

var app = express();

app.use("/assets", express.static(path.resolve(__dirname, '../assets')));

app.get(config.prefix+'/search', function(req, res){

	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.setHeader('Expires', 'Mon, 26 Jul 1997 05:00:00 GMT');
	res.setHeader('Cache-Control', 'no-cache, must-revalidate');

	// req.query = querystring.parse(req._parsedUrl['query'].replace(/\+/g, '%2B'));

	if (!('q' in req.query) || req.query.q === '') {
		
		res.send(index_parse({"result": []}, ''));
		
	} else {
		
		console.log("query: "+req.query.q);

		var result = plaque.search(req.query.q);
		
		if (result.length === 0) {
			
			res.send(index_parse({"result": []}, req.query.q));

		} else {
			
			var data = [];
			
			var data = {
				"amd": [],
				"lob": []
			};
			
			result['amd'].forEach(function(uid){
				data['amd'].push(plaque.get_amd(uid));
			});
			
			result['lob'].forEach(function(sid){
				data['lob'].push(plaque.get_lob(sid));
			});
			
			res.send(index_parse({"result": data}, req.query.q));

		}
		
	}
	
	res.end();
	
});

app.get(config.prefix+'/api', function(req, res){

	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.setHeader('Expires', 'Mon, 26 Jul 1997 05:00:00 GMT');
	res.setHeader('Cache-Control', 'no-cache, must-revalidate');
	res.setHeader('Access-Control-Allow-Origin', '*');
		
	// req.query = querystring.parse(req._parsedUrl['query'].replace(/\+/g, '%2B'));
	
	if (!('q' in req.query) || req.query.q === '') {
		
		res.json({"result": []});
		
	} else {
		
		console.log("query: "+req.query.q);

		var result = plaque.search(req.query.q);
		
		if (result["amd"].length === 0 && result["lob"].length === 0) {
			
			res.json({"result": []});

		} else {
			
			var data = {
				"amd": [],
				"lob": []
			};
			
			result['amd'].forEach(function(uid){
				data['amd'].push(plaque.get_amd(uid));
			});
			
			result['lob'].forEach(function(uid){
				data['lob'].push(plaque.get_lob(uid));
			});
			
			res.json({"result": data});

		}
		
	}
	
	res.end();

});

app.get(config.prefix+'/', function(req, res){
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(mustache.render(tmpl.index, {
		"active_research": true,
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
