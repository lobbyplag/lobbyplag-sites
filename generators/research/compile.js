#!/usr/bin/env node

console.log("UPDATE ME");
process.exit();

String.prototype.clean = function(){
	return this.toLowerCase().replace(/[^\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F]/g, ' ').replace(/\s+/g, ' ');
};

var fs = require('fs');
var path = require('path');
var colors = require('colors');

/* amendments */
var _amds = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/amendments.json'))).amendments;
var _amds_index = [];
var _amds_display = 0;

_amds.forEach(function(_amd, _amds_count){
	
	/* gauge */
	_amds_count++;
	var _amds_perc = (Math.round((_amds_count/_amds.length)*1000)/10).toFixed(1);
	if (_amds_perc !== _amds_display) {
		_amds_display = _amds_perc;
		process.stdout.write('\r'+(" IDX-A ".inverse.bold.magenta)+(" "+_amds_display+"%").cyan);
	}
	
	/* add to index */
	_amds_index.push({
		'uid': _amd.uid,
		'text': {
			'old': _amd.text.old.toString().clean(),
			'new': _amd.text.new.toString().clean()
		}
	});
	
});

/* end gauge */
process.stdout.write('\r'+(" IDX-A ".inverse.bold.magenta)+(" complete. ").green+'\n');

/* write index and data */
fs.writeFileSync(path.resolve(__dirname, '../../frontends/research/data/index.amd.json'), JSON.stringify(_amds_index));
fs.writeFileSync(path.resolve(__dirname, '../../frontends/research/data/data.amd.json'), JSON.stringify(_amds));

/* lobbyist index */
var _lobbyists = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/lobbyists.json'))).forEach(function(_lobbyist){
	_lobbyists[_lobbyist.id] = _lobbyist;
});

/* document index */
var _documents = {};
JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/documents.json'))).forEach(function(_document){
	_documents[_document.uid] = _document;
});

/* proposals */
var _props = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/proposals.json')));
var _props_index = [];
var _props_data = {};
var _props_display = 0;

_props.forEach(function(_prop, _props_count){
	
	/* gauge */
	_props_count++;
	var _props_perc = (Math.round((_props_count/_props.length)*1000)/10).toFixed(1);
	if (_props_perc !== _props_display) {
		_props_display = _props_perc;
		process.stdout.write('\r'+(" IDX-P ".inverse.bold.magenta)+(" "+_props_display+"%").cyan);
	}
	
	/* add to index */
	_props_index.push({
		'uid': _prop.uid,
		'text': {
			'old': _prop.text.old.toString().clean(),
			'new': _prop.text.new.toString().clean()
		}
	});
	
	var _doc = _documents[_prop.doc_uid];
	var _lob = _lobbyists[_doc.lobbyist];
	
	/* make data */
	_props_data[_prop.uid] = {
		"uid": _prop.uid,
		"lobbyist_title": _lob.title,
		"lobbyist_url": _lob.url,
		"diff": _prop.diff,
		"url": 'http://www.lobbyplag.eu/data/papers/'+_doc.filename,
		"page": _prop.page
	};
	
});

/* end gauge */
process.stdout.write('\r'+(" IDX-P ".inverse.bold.magenta)+(" complete. ").green+'\n');

/* write index and data */
fs.writeFileSync(path.resolve(__dirname, '../../frontends/research/data/index.prop.json'), JSON.stringify(_props_index));
fs.writeFileSync(path.resolve(__dirname, '../../frontends/research/data/data.prop.json'), JSON.stringify(_props_data));

console.error(' <3 '.inverse.bold.magenta, 'made with datalove'.bold.magenta);
process.exit(0);