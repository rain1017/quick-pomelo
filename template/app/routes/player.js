'use strict';

var route = {};

route.handler = function(session, msg){
	return session.uid || msg.playerId;
};

module.exports = route;
