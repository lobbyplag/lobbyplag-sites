
mep.group_id = mep.party.toLowerCase();
if (mep.group_id === "s&d")
	mep.group_id = "sd";
else if (mep.group_id === "gue/ngl")
	mep.group_id = "gue-ngl";

//meps.forEach(function (mep) {
//	var _mep = raw_meps_data[mep.id];
//	_mep.party = mep.localparty;
//	_mep.email = mep.email;
//	_mep.firstname = mep.firstname;
//	_mep.surname = mep.surname;
//	_mep.title = mep.title;
//	_mep.salutation = mep.salutation;
//});
//fs.writeFileSync(path.resolve(__dirname, config.datadir, 'mep.json'), JSON.stringify(raw_meps_data, null, '\t'));

//meps.forEach(function (mep) {
//	if (mep.localparty) {
//		var _group = raw_groups[mep.group_id];
//		_group.local = _group.local || {};
//		_group.local[mep.country_id] = _group.local[mep.country_id] || [];
//		if (_group.local[mep.country_id].indexOf(mep.localparty) < 0) {
//			_group.local[mep.country_id].push(mep.localparty);
//		}
//	}
//});
//
//fs.writeFileSync(path.resolve(__dirname, config.datadir, 'groups.json'), JSON.stringify(raw_groups, null, '\t'));

