'use strict';

var Q = require('q');
var logger = require('pomelo-logger').getLogger('area-proxy', __filename);

/**
 *
 * @param opts.app - pomelo app instance
 */
var AreaProxy = function(opts){
	opts = opts || {};

	this.app = opts.app;
	this.area2server = opts.area2serverCache;
};

// var proto = AreaProxy.prototype;

// proto.invokeArea = function(areaId, handler, opts){
// 	var self = this;

// 	this.area2server.get(areaId).then(function(serverId){
// 		if(serverId === self.app.serverId){
// 			return self.areaServer.invokeArea(areaId, opts);
// 		}
// 		else{
// 			return Q.fncall(function(){
// 				route = serverId;
// 				self.app.rpc.areaServer.areaRemote.invokeArea(route, areaId, opts);
// 			});
// 		}
// 	});
// };

module.exports = AreaProxy;
