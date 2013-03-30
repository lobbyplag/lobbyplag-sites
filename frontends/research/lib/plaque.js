var fs = require("fs");
var searchstring = require(__dirname+"/../lib/searchstring");
var http = require('http');

var data = {
	"amd": {},
	"lob": {}
}

var amd_index = JSON.parse(fs.readFileSync(__dirname+"/../data/index.amd.json"));
var amd_data = JSON.parse(fs.readFileSync(__dirname+"/../data/data.amd.json"));

var lob_index = JSON.parse(fs.readFileSync(__dirname+"/../data/index.prop.json"));
data["lob"] = JSON.parse(fs.readFileSync(__dirname+"/../data/data.prop.json"));

/* amendments meta */

amd_data.forEach(function(s){	
	data['amd'][s.uid] = {
		"uid": s.uid,
		"ptid": s.ptid,
		"committee": s.committee,
		"date": s.date,
		"amendment": s.amendment,
		"authors": s.authors,
		"location": s.location,
		"diff": s.diff
	};
});

module.exports.search = function(query) {

	var result = {
		"amd": [],
		"lob": []
	};
	
	searchstring(query).forEach(function(bit){
		
		var amd_bitresult = [];
		var lob_bitresult = [];

		amd_index.forEach(function(idx){
			
			if (result['amd'].length === 0 || result['amd'].indexOf(idx.uid) >= 0) {
				
				switch(bit.t) {
					case "ins":
						if (idx.text.new.match(bit.r) && !idx.text.old.match(bit.r)) {
							amd_bitresult.push(idx.uid);
						}
					break;
					case "del":
						if (idx.text.old.match(bit.r) && !idx.text.new.match(bit.r)) {
							amd_bitresult.push(idx.uid);
						}
					break;
					case "both":
						if (idx.text.old.match(bit.r) && idx.text.new.match(bit.r)) {
							amd_bitresult.push(idx.uid);
						}
					break;
					case "any":
						if (idx.text.old.match(bit.r) || idx.text.new.match(bit.r)) {
							amd_bitresult.push(idx.uid);
						}
					break;
				}
				
			}
			
		});
		
		lob_index.forEach(function(idx){
			
			if (result['lob'].length === 0 || result['lob'].indexOf(idx.uid) >= 0) {
				
				switch(bit.t) {
					case "ins":
						if (idx.text.new.match(bit.r) && !idx.text.old.match(bit.r)) {
							lob_bitresult.push(idx.uid);
						}
					break;
					case "del":
						if (idx.text.old.match(bit.r) && !idx.text.new.match(bit.r)) {
							lob_bitresult.push(idx.uid);
						}
					break;
					case "both":
						if (idx.text.old.match(bit.r) && idx.text.new.match(bit.r)) {
							lob_bitresult.push(idx.uid);
						}
					break;
					case "any":
						if (idx.text.old.match(bit.r) || idx.text.new.match(bit.r)) {
							lob_bitresult.push(idx.uid);
						}
					break;
				}
				
			}
			
		});
		
		result.amd = amd_bitresult;
		result.lob = lob_bitresult;
		
	});
	
	return result;
	
};

module.exports.get_amd = function(uid) {
	if (uid in data["amd"]) {
		return data["amd"][uid];
	} else {
		return {};
	}
}

module.exports.get_lob = function(uid) {
	if (uid in data["lob"]) {
		return data["lob"][uid];
	} else {
		return {};
	}
}