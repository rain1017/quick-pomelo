'use strict';

var route = {};

route.handler = function(session, msg){
	return msg.teamId;
};

module.exports = route;
