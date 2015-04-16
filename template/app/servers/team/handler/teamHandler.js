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
		return this.app.controllers.team.create(opts);
	})
	.nodeify(next);
};

proto.remove = function(msg, session, next){
	var teamId = msg.teamId || session.uid;
	if(!teamId){
		return next(new Error('teamId is missing'));
	}

	P.bind(this)
	.then(function(){
		return this.app.controllers.team.remove(teamId);
	})
	.nodeify(next);
};

proto.join = function(msg, session, next){
	var playerId = session.uid;
	var teamId = msg.teamId;
	if(!playerId || !teamId){
		return next(new Error('playerId or teamId is missing'));
	}

	P.bind(this)
	.then(function(){
		return this.app.controllers.team.join(teamId, playerId);
	})
	.nodeify(next);
};

proto.quit = function(msg, session, next){
	var playerId = session.uid;
	var teamId = msg.teamId;
	if(!playerId || !teamId){
		return next(new Error('playerId or teamId is missing'));
	}

	P.bind(this)
	.then(function(){
		return this.app.controllers.team.quit(teamId, playerId);
	})
	.nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
