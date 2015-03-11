'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);
var pomeloClient = require('./pomelo-client');

var Client = function(opts){
	this.client = pomeloClient();
	this.opts = opts;
};

var proto = Client.prototype;

proto.connect = function(){
	var self = this;
	return Q.nfcall(function(cb){
		self.client.init(self.opts, function(data){
			if(!!data){
				cb(null, data);
			}
			else{
				cb(new Error('connect failed'));
			}
		});
	});
};

proto.disconnect = function(){
	this.client.disconnect();
};

proto.request = function(route, msg){
	var self = this;
	msg = msg || {};
	return Q.nfcall(function(cb){
		self.client.request(route, msg, function(ret){
			if(ret.code === 500){
				cb(ret);
				logger.error('response %s %j => %j', route, msg, ret);
				return;
			}
			logger.info('response %s %j => %j', route, msg, ret);
			cb(null, ret);
		});
	});
};

proto.notify = function(route, msg){
	this.client.notify(route, msg);
};

proto.on = function(route, fn){
	this.client.on(route, fn);
};

module.exports = function(opts){
	return new Client(opts);
};
