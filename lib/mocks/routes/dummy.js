'use strict';

var route = {};

route.handler = function(session, msg){
	return msg.dummyId;
};

route.remote = function(routeParam, args){
	return routeParam;
};

module.exports = route;
