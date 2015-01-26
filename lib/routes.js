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

module.exports = routes;
