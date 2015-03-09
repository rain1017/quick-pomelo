'use strict';

var route = {};

route.handler = function(session, msg){
	return session.uid || msg.playerId;
};

route.remote = function(routeParam, args){
	return routeParam ? routeParam.playerId : null;
};

module.exports = route;
