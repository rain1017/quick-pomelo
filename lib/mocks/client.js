'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);
var pomeloClient = require('./pomelo-client');

var Client = function(){
	this.client = pomeloClient();
};

var proto = Client.prototype;

proto.init = function(opts){
	var self = this;
	return Q.nfcall(function(cb){
		self.client.init(opts, function(data){
			if(!!data){
				cb(null, data);
			}
			else{
				cb(new Error('init failed'));
			}
		});
	});
};

proto.request = function(route, msg){
	var self = this;
	return Q.nfcall(function(cb){
		logger.debug('request %s %s', route, util.inspect(msg));
		self.client.request(route, msg, function(data){
			if(data.code === 500){
				cb(data);
				logger.error('response %s %s => %s', route, util.inspect(msg), util.inspect(data));
				return;
			}
			logger.info('response %s %s => %s', route, util.inspect(msg), util.inspect(data));
			cb(null, data);
		});
	});
};

proto.notify = function(route, msg){
	this.client.notify(route, msg);
};

proto.disconnect = function(){
	this.client.disconnect();
};

module.exports = Client;
