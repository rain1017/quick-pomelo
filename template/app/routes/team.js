'use strict';

var route = {};

route.handler = function(session, msg){
	return msg.teamId;
};

route.remote = function(routeParam, args){
	return routeParam ? routeParam.teamId : null;
};

module.exports = route;
