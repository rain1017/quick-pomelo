'use strict';

var util = require('util');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);

var MockChannel = function(opts){
	opts = opts || {};
	this.name = opts.name;
	this.members = {};
};

MockChannel.prototype.add = function(uid, sid){
	this.members[uid] = {uid : uid, sid : sid};
};

MockChannel.prototype.leave = function(uid, sid){
	delete this.members[uid];
};

MockChannel.prototype.getMember = function(uid){
	return this.members[uid];
};

MockChannel.prototype.pushMessage = sinon.spy(function(route, msg){
	logger.debug('push message on channel %s', this.name);
});


var MockChannelService = function(){
	this.channels = {};
};

MockChannelService.prototype.getChannel = function(name, create){
	if(!this.channels.hasOwnProperty(name)){
		if(!create){
			return;
		}
		this.channels[name] = new MockChannel({name : name});
	}
	return this.channels[name];
};

MockChannelService.prototype.destroyChannel = function(name){
	delete this.channels[name];
};

MockChannelService.prototype.pushMessageByUids = sinon.spy(function(route, msg, uidsids){
	logger.debug('push message by uids %s', util.inspect(uidsids));
});

module.exports = MockChannelService;
