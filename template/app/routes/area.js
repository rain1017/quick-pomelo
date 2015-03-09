'use strict';

var route = {};

route.handler = function(session, msg){
	return msg.areaId;
};

route.remote = function(routeParam, args){
	return routeParam ? routeParam.areaId : null;
};

module.exports = route;
