'use strict';

exports.hashDispatch = function(id, servers){
	if(servers.length === 0){
		return;
	}

	if(id === null || id === undefined){
		return servers[0];
	}

	if (typeof(id) !== 'string') {
		id = String(id);
	}
	var md5 = require('crypto').createHash('md5').update(id).digest('hex');
	var hash = parseInt(md5.substr(0, 8), 16);

	return servers[hash % servers.length];
};

