var fs = require("fs");
var path = require("path");
var colors = require("colors");
var argv = require("optimist")
	.boolean(['d'])
	.alias("d","debug")
	.argv;

/* get config */
var config = require(path.resolve(__dirname, '../../config.js'));

/* get data */
var _data = [];
var _lobbyists = JSON.parse(fs.readFileSync(path.resolve(config.datadir, 'lobbyists.json')));
var _documents = JSON.parse(fs.readFileSync(path.resolve(config.datadir, 'documents.json')));
var _lang = JSON.parse(fs.readFileSync(path.resolve(config.datadir, 'lang.json')));

/* make lobbyist index */
var _lobbyists_index = {};
_lobbyists.forEach(function(_lobbyist){
	_lobbyists_index[_lobbyist.id] = _lobbyist;
});


_documents.forEach(function(_doc){
	if (!(_doc.lobbyist in _lobbyists_index)) {
		var _lobbyist = {
			"title": null,
			"url": null
		}
	} else {
		var _lobbyist = _lobbyists_index[_doc.lobbyist];
	}
	_data.push({
		"uid": _doc.uid,
		"lang": _lang[_doc.lang],
		"filename": _doc.filename,
		"url": config.document_url+_doc.filename,
		"imported": _doc.imported,
		"pages": _doc.data.pages,
		"lobbyist": _lobbyist.title,
		"lobbyist_url": _lobbyist.url
	});
});

_data = _data.sort(function(a,b){
	if (a.lobbyist === null) return 1;
	if (b.lobbyist === null) return -1;
	if (a.lobbyist.toLowerCase() < b.lobbyist.toLowerCase()) return -1;
	if (a.lobbyist.toLowerCase() > b.lobbyist.toLowerCase()) return 1;
	if (a.filename < b.filename) return -1;
	if (a.filename > b.filename) return 1;
	return 0;
});

if (argv.d) {
	fs.writeFileSync('debug-documents.json', JSON.stringify(_data,null,'\t'));
} else {
	fs.writeFileSync(path.resolve(config.frontenddir, 'docs/data/documents.json'), JSON.stringify(_data,null,'\t'));
}

console.error(' <3 '.inverse.bold.magenta, 'made with datalove'.bold.magenta);
process.exit(0);

