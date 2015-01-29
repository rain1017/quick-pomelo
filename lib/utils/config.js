'use strict';

var exports = {};

exports.initMongoConfig = function(config){
	config = config || {};
	var uri = config.uri || 'mongodb://localhost/quick-pomelo';
	var options = config.options || {};

	//set keepAlive (http://mongoosejs.com/docs/connections.html)
	options.server = options.server || {};
	options.server.socketOptions = options.server.socketOptions || {};
	options.server.socketOptions.keepAlive = 1;
	return config;
};

exports.initRedisConfig = function(config){
	config = config || {};
	config.host = config.host || '127.0.0.1';
	config.port = config.port || 6379;
	return config;
};

module.exports = exports;
