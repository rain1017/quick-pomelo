'use strict';

var routes = {

};

routes.area = function(routeParam, msg, app, cb){
	if(msg.method === 'forwardMessage'){
		// Message is forwarded for a handler
		cb(new Error('forwardMessage is not allowed for area-server'));
	}
	var serverId = routeParam;
	cb(null, serverId);
};

routes.connector = function(routeParam, msg, app, cb){
	cb(null, routeParam.frontendId);
};

module.exports = routes;
