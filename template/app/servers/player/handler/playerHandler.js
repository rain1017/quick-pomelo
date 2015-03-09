'use strict';

var Q = require('q');

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

proto.create = function(msg, session, next){
	var opts = msg.opts;

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.player.createPlayer(opts);
	}).nodeify(next);
};

proto.remove = function(msg, session, next){
	var playerId = msg.playerId || session.uid;
	if(!playerId){
		return next(new Error('playerId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.player.removePlayer(playerId);
	}).nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
