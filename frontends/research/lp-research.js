#!/usr/bin/env node

/* get confog */
var config = require('./config');

var fs = require('fs');
var http = require('http');
var express = require('express');
var mustache = require('mustache');
var colors = require('colors');
var querystring = require('querystring');
var plaque = require(__dirname+"/lib/plaque");

var tmpl_index = fs.readFileSync(__dirname+"/assets/tmpl/index.mustache").toString();
var tmpl_result = fs.readFileSync(__dirname+"/assets/tmpl/result.mustache").toString();

var index_parse = function(data, q) {

	console.log(q);

	return mustache.render(tmpl_index, {
		"content": mustache.render(tmpl_result, data),
		"q": q
	});
	
};

var app = express();

app.use("/assets", express.static(__dirname + '/assets'));

app.get('/search', function(req, res){

	res.setHeader('Content-Type', 'text-html; charset=utf-8');
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

app.get('/api', function(req, res){

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

app.get('*', function(req, res){
	res.status(404);
	res.send("meh.");
	res.end();
});

app.listen(config.port, config.hostname);

console.log('Listen '+config.hostname+':'+config.port);
