'use strict';

var P = require('bluebird');

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

proto.create = function(msg, session, next){
	var opts = msg.opts;

	P.bind(this)
	.then(function(){
		return this.app.controllers.player.create(opts);
	})
	.nodeify(next);
};

proto.remove = function(msg, session, next){
	var playerId = session.uid;
	if(!playerId){
		return next(new Error('player is not logged in'));
	}

	P.bind(this)
	.then(function(){
		return this.app.controllers.player.remove(playerId);
	})
	.then(function(){
		return P.promisify(session.unbind, session)(playerId);
	})
	.nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
