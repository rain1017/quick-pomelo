'use strict';

var route = {};

route.handler = function(session, method, msg){
    return msg.areaId;
};

route.remote = function(routeParam, method, args){
    return routeParam;
};

module.exports = route;
