'use strict';

var P = require('bluebird');

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

proto.create = function(msg, session, next){
	var opts = msg.opts;
	return this.app.controllers.area.createAsync(opts)
	.nodeify(next);
};

proto.remove = function(msg, session, next){
	var areaId = msg.areaId || session.uid;
	if(!areaId){
		return next(new Error('areaId is missing'));
	}
	return this.app.controllers.area.removeAsync(areaId)
	.nodeify(next);
};

proto.join = function(msg, session, next){
	var playerId = session.uid;
	var areaId = msg.areaId;
	if(!playerId || !areaId){
		return next(new Error('playerId or areaId is missing'));
	}
	return this.app.controllers.area.joinAsync(areaId, playerId)
	.nodeify(next);
};

proto.quit = function(msg, session, next){
	var playerId = session.uid;
	var areaId = msg.areaId;
	if(!playerId || !areaId){
		return next(new Error('playerId or areaId is missing'));
	}
	return this.app.controllers.area.quitAsync(areaId, playerId)
	.nodeify(next);
};

proto.push = function(msg, session, next){
	var areaId = msg.areaId;
	if(!areaId){
		return next(new Error('areaId is missing'));
	}
	return this.app.controllers.area.pushAsync(areaId, msg.playerIds, msg.route, msg.msg, msg.persistent)
	.nodeify(next);
};

proto.getMsgs = function(msg, session, next){
	var areaId = msg.areaId;
	if(!areaId){
		return next(new Error('areaId is missing'));
	}
	return this.app.controllers.area.getMsgsAsync(areaId, msg.seq, msg.count)
	.nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
