'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('connector', __filename);

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

var authFunc = function(token){
	//TODO: authentication;
	return token;
};

/**
 * msg.auth - authentication data
 */
proto.login = function(msg, session, next){
	if(!!session.uid){
		return next(new Error('session already logged in with playerId ' + session.uid));
	}

	var token = msg.token;
	if(!token){
		return next(new Error('token is missing'));
	}

	var playerId = null;
	var self = this;

	return Q.fcall(function(){
		return authFunc(token);
	})
	.then(function(ret){
		playerId = ret;
		if(!playerId){
			throw new Error('Invalid token: ' + token);
		}
	})
	.then(function(){
		return self.app.controllers.player.connect(playerId, session.frontendId);
	})
	.then(function(oldConnectorId){
		if(oldConnectorId){
			logger.warn('player %s already connected on %s, will kick', playerId, oldConnectorId);
			// kick original connector
			return Q.nfcall(function(cb){
				self.app.rpc.connector.entryRemote.kick({frontendId : oldConnectorId}, playerId, cb);
			});
		}
	})
	.then(function(){
		return Q.ninvoke(session, 'bind', playerId);
	})
	.then(function(){
		// OnDisconnect
		session.on('closed', function(session, reason){
			if(reason === 'kick' || !session.uid){
				return;
			}
			// auto logout on disconnect
			var autoConn = self.app.memdb.autoConnect();
			autoConn.execute(function(){
				return Q.nfcall(function(cb){
					self.logout({closed : true}, session, cb);
				});
			})
			.catch(function(e){
				logger.warn(e);
			});
		});
	})
	.then(function(){
		logger.info('player %s login', playerId);
	})
	.nodeify(next);
};

proto.logout = function(msg, session, next){
	var playerId = session.uid;
	if(!playerId){
		return next(new Error('playerId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.player.disconnect(playerId);
	})
	.then(function(){
		if(!msg.closed){
			return Q.ninvoke(session, 'unbind', playerId);
		}
	})
	.then(function(){
		logger.info('player %s logout', playerId);
	})
	.nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
