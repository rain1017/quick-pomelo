'use strict';

var route = {};

route.handler = function(session, method, msg){
    return session.uid || msg.playerId;
};

route.remote = function(routeParam, method, args){
    return routeParam;
};

module.exports = route;
