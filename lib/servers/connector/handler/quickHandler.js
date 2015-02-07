'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('handler', __filename);

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

/**
 * msg.auth - authentication data
 *
 */
proto.login = function(msg, session, next){
	var authFunc = this.app.get('authFunc');
	if(!authFunc){
		return next(new Error('app.authFunc not set'));
	}

	var token = msg.auth;
	if(!token){
		return next(new Error('auth is missing'));
	}

	var playerId = null;
	var self = this;
	Q.fcall(function(){
		return Q.fcall(function(){
			return authFunc(token);
		}).then(function(ret){
			playerId = ret;
			if(!playerId){
				throw new Error('Authentication failed');
			}
		}).then(function(){
			return self.app.playerProxy.invokePlayer(playerId, 'getConnectorId');
		}).then(function(connecterId){
			if(!!connecterId){
				// already online, so kick
				return Q.ninvoke(self.app.rpc.connector.quickRemote, {frontendId : connecterId}, 'kick', playerId)
				.catch(function(e){
					logger.warn(e.stack);
				});
			}
		}).then(function(){
			return Q.ninvoke(session, 'bind', playerId);
		}).then(function(){
			// OnDisconnect
			session.on('closed', function(session, reason){
				if(!session.uid){
					return;
				}
				self.logout({}, session, function(err){
					if(err){
						logger.warn(err.stack);
					}
				});
			});
			return self.app.playerProxy.invokePlayer(playerId, 'login', session.frontendId);
		}).then(function(){
			var data = {};
			return Q.fcall(function(){
				return self.app.playerProxy.invokePlayer(playerId, 'toJSON');
			}).then(function(player){
				data.player = player;
				return self.app.playerBackend.getPlayerOwnerId(playerId);
			}).then(function(areaId){
				if(!!areaId){
					return self.app.areaProxy.invokeArea(areaId, 'toJSON');
				}
			}).then(function(area){
				data.area = area;
				return data;
			});
		});
	}).then(function(data){
		next(null, data);
	}, next);
};

proto.logout = function(msg, session, next){
	var playerId = session.uid;
	if(!playerId){
		return next(new Error('playerId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.playerProxy.invokePlayer(playerId, 'logout');
	}).then(function(){
		return Q.ninvoke(session, 'unbind', playerId);
	}).then(function(){
		next();
	}, next);
};

proto.getAreas = function(msg, session, next){
	var type = msg.type;
	if(!type){
		return next(new Error('type is missing'));
	}

	var self = this;
	Q.fcall(function(){
		var Model = self.app.areaBackend.getAreaModel(type);
		return Q.ninvoke(Model, 'find', {__t : type});
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.createArea = function(msg, session, next){
	var opts = msg.opts;
	var type = msg.type;
	if(!opts || !type){
		return next(new Error('opts or type is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.areaBackend.createArea(opts, type);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.removeArea = function(msg, session, next){
	var areaId = msg.areaId;
	if(!areaId){
		return next(new Error('areaId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.areaBackend.removeArea(areaId);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.invokeArea = function(msg, session, next){
	var areaId = msg.areaId;
	var method = msg.method;
	var args = msg.args;
	if(!areaId || !method){
		return next(new Error('areaId or method is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.areaProxy.invokeArea(areaId, method, args);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.createPlayer = function(msg, session, next){
	var opts = msg.opts;
	if(!opts){
		return next(new Error('opts is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.playerBackend.createPlayer(opts);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.removePlayer = function(msg, session, next){
	var playerId = msg.playerId || session.uid;
	if(!playerId){
		return next(new Error('playerId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.playerBackend.removePlayer(playerId);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.joinArea = function(msg, session, next){
	var playerId = session.uid;
	var areaId = msg.areaId;
	if(!playerId || !areaId){
		return next(new Error('playerId or areaId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.playerProxy.quitArea(playerId, {ignoreNoArea : true});
	}).then(function(){
		return self.app.playerProxy.joinArea(playerId, areaId);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.quitArea = function(msg, session, next){
	var playerId = session.uid;
	if(!playerId){
		return next(new Error('playerId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.playerProxy.quitArea(playerId);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

proto.invokePlayer = function(msg, session, next){
	var playerId = session.uid;
	var method = msg.method;
	var args = msg.args;
	if(!playerId || !method){
		return next(new Error('playerId or method is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.playerProxy.invokePlayer(playerId, method, args);
	}).then(function(ret){
		next(null, ret);
	}, next);
};

module.exports = function(app){
	return new Handler(app);
};
