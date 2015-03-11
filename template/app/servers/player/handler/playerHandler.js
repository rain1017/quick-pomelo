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
		return self.app.controllers.player.create(opts);
	})
	.nodeify(next);
};

proto.remove = function(msg, session, next){
	var playerId = session.uid;
	if(!playerId){
		return next(new Error('player is not logged in'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.player.remove(playerId);
	})
	.then(function(){
		return Q.ninvoke(session, 'unbind', playerId);
	})
	.nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
