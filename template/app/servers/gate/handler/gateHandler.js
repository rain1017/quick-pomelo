'use strict';

var _ = require('lodash');

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

proto.getConnector = function(msg, session, next){
	var servers = this.app.getServersByType('connector');
	var server = _.sample(servers);
	if(!server){
		return next(new Error('No connector server available'));
	}
	var data = {host : server.clientHost, port : server.clientPort};
	next(null, data);
};

module.exports = function(app){
	return new Handler(app);
};
