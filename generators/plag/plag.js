#!/usr/bin/env node

/**
	find plags
**/

var fs = require("fs");
var path = require("path");
var colors = require("colors");
var natural = require("natural");
var argv = require("optimist").boolean(['v']).argv;
var diff = require(path.resolve(__dirname, "lib/diff"));

/* check for verbosity level */
var verbosity = 0;
if (argv.v) {
	process.argv.forEach(function(arg){
		if (arg.match(/^\-([a-z0-9]+)$/)) verbosity += arg.replace(/[^v]/g, '').length;
	});
}

/* helper for diff display */

var prettydiff = function(diff) {
	diff = diff.replace(/<span>([^<]+)<\/span>/g, function(d){
		return d.replace(/<span>([^<]+)<\/span>/g, '$1').black;
	});
	diff = diff.replace(/<ins>([^<]+)<\/ins>/g, function(d){
		return d.replace(/<ins>([^<]+)<\/ins>/g, '$1').green;
	});
	diff = diff.replace(/<del>([^<]+)<\/del>/g, function(d){
		return d.replace(/<del>([^<]+)<\/del>/g, '$1').red;
	});
	return diff;
}

/* define megadice */

var _stat_count = 0;
var diceroll = function(str_a, str_b) {
	
	var _triples_a = natural.NGrams.trigrams(str_a);
	var _triples_b = natural.NGrams.trigrams(str_b);
	
	var _count = 0;
	var _total = 0;
	
	_triples_a.forEach(function(_trigram_a){
		_triples_b.forEach(function(_trigram_b){
			_stat_count++;
			var _dice = natural.DiceCoefficient(_trigram_a.join(' '), _trigram_b.join(' '));
			if (_dice > 0.5) {
				if (argv.v && verbosity >= 5) console.log('\r'+'DICE'.inverse.bold.magenta, _dice.toFixed(3).green.bold, _trigram_a.join(' ').cyan, _trigram_b.join(' ').yellow);
				_count++;
				_total += _dice;
			}
		});
	});

	var _diceroll = (_count === 0) ? 0 : (((_total/_count)-0.5)*2);

	if (argv.v && verbosity >= 4) console.log('\r'+'ROLL'.inverse.bold.magenta, _diceroll.toFixed(3).green.bold, str_a.cyan, str_b.yellow);
	
	return _diceroll;
	
}

/* load amendments and proposals */

if (argv.v) console.log('hello.'.green.inverse.bold, 'loading data.');

var _amds = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/amendments.json"))).amendments;
var _props = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/proposals.json")));

/* index amendments and proposals by relation */

if (argv.v) console.log('done.'.green.inverse.bold, 'making indexes.');

var _index = [];
var _amds_idx = {};
var _props_idx = {};

_amds.forEach(function(_amd){
	_amd.relations.forEach(function(_rel){
		if (_index.indexOf(_rel) < 0) _index.push(_rel);
		if (!(_rel in _amds_idx)) _amds_idx[_rel] = [];
		_amds_idx[_rel].push(_amd);
	});
});

_props.forEach(function(_prop){
	_prop.relations.forEach(function(_rel){
		if (_index.indexOf(_rel) < 0) _index.push(_rel);
		if (!(_rel in _props_idx)) _props_idx[_rel] = [];
		_props_idx[_rel].push(_prop);
	});
});

_index.sort();

/* walk through comparison */

_length = 0;
_count = 0;
_display = '';
_result = [];

_index.forEach(function(_rel){
	if (_rel in _props_idx) _props_idx[_rel].forEach(function(_prop){
		if (_rel in _amds_idx) _amds_idx[_rel].forEach(function(_amd){
			_length++;
		});
	});
});

if (argv.v) console.log('ready.'.green.inverse.bold, 'lets make', _length.toString().green.bold, 'comparisons.');

_index.forEach(function(_rel){
	if (_rel in _props_idx) _props_idx[_rel].forEach(function(_prop){
		if (_rel in _amds_idx) _amds_idx[_rel].forEach(function(_amd){
			
			/* gauge update */
			_count++;
			var _perc = (Math.round((_count/_length)*1000)/10).toFixed(1);
			if (_perc !== _display) {
				_display = _perc;
				process.stdout.write('\r'+(" comp ".inverse.bold.green)+(" "+_display+"%").cyan);
			}
			
			/* check for overwhelming similarity */
			// FIXME
			
			var _dice = 0;
			
			/* compare insertions */
			_prop.text.ins.forEach(function(_str_a){
				_amd.text.ins.forEach(function(_str_b){
					if (_str_a === 'new' || _str_b === 'new') return;
					var _thisdice = diceroll(_str_a, _str_b);
					if (_thisdice > _dice) _dice = _thisdice;
				});
			});
			if (_dice > 0 && argv.v && verbosity >= 2) console.log('\r'+'WALK'.inverse.bold.magenta, 'INS'.green.bold, _count.toString(), ((_dice > 0.4) ? _dice.toFixed(3).magenta.bold : _dice.toFixed(3).white.bold));
			if (_dice > 0 && argv.v && verbosity >= 3) console.log('\n'+'----------------------'.grey+'\n'+prettydiff(_prop.diff)+'\n'+'----------------------'.grey+'\n'+prettydiff(_amd.diff)+'\n');

			if (_dice > 0.4) {
				_result.push({
					"diceroll": _dice,
					"amendment": _amd.uid,
					"proposal": _prop.uid
				});
				return;
			}

			_dice = 0;
			/* compare deletions, skip full deletions */
			if (_prop.text.new.replace(/^\s*deleted\s*$/,'') !== "" && _amd.text.new.replace(/^\s*deleted\s*$/,'') !== "")
			_prop.text.del.forEach(function(_str_a){
				_amd.text.del.forEach(function(_str_b){
					if (_str_a === 'deleted' || _str_b === 'deleted') return;
					var _thisdice = diceroll(_str_a, _str_b);
					if (_thisdice > _dice) _dice = _thisdice;
				});
			});
			if (_dice > 0 && argv.v && verbosity >= 2) console.log('\r'+'WALK'.inverse.bold.magenta, 'DEL'.red.bold, _count.toString(), ((_dice > 0.4) ? _dice.toFixed(3).magenta.bold : _dice.toFixed(3).white.bold));
			if (_dice > 0 && argv.v && verbosity >= 3) console.log('\n'+'----------------------'.grey+'\n'+prettydiff(_prop.diff)+'\n'+'----------------------'.grey+'\n'+prettydiff(_amd.diff)+'\n');
			
			if (_dice > 0.4) {
				_result.push({
					"diceroll": _dice,
					"amendment": _amd.uid,
					"proposal": _prop.uid
				});
				return;
			}
				
			/* check for full deletion */
			// FIXME

		});
	});
});

_result.sort(function(a,b){
	return b.diceroll-a.diceroll;
});

process.stdout.write('\r'+(" comp ".inverse.bold.magenta)+(" complete. ").green+'\n');

if (argv.v) console.log('stat'.inverse.green.bold, _stat_count.toString().magenta, 'text part comparisons with', _result.length.toString().magenta, 'possible matches');
if (argv._.length > 0) fs.writeFileSync(path.resolve(argv._[0]), JSON.stringify(_result), 'utf-8');

console.error(' <3 '.bold.inverse.magenta, 'made with datalove'.bold.magenta);
process.exit(0);
