
module.exports = function(q) {
	
	var regex_split = /(\+|\-|\=)?((\"|\')([^\"\']+)(\3)|([\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F\*]+))/g;
	var regex_parse = /(\+|\-|\=)?((\"|\')([^\"\']+)(\3)|([\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F\*]+))/;
	
	var bits = [];
	
	var parts = q.match(regex_split);
	
	if (parts && typeof parts === 'object') {
	
		parts.forEach(function(atom){
		
			var bit = {};
		
			var m = atom.match(regex_parse);
		
			bit.t = (m[1] === undefined) ? 'any' : (m[1] === '=') ? 'both': (m[1] === '+') ? 'ins' : 'del';
			bit.s = (m[4] === undefined) ? m[6] : m[4];
		
			if (bit.s !== undefined && bit.s.length >= 3) {
			
				bit.u = bit.s.replace(/[^\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F\* ]/g,' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ' ').toLowerCase();
				bit.r = new RegExp(bit.u.replace(/\*/g,'(.*)'));
			
				bits.push(bit);
			
			}
		
		});
		
	}
	
	return bits;
	
}