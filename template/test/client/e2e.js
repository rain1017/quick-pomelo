'use strict';

var Q = require('q');
var quick = require('quick-pomelo');
var logger = require('pomelo-logger').getLogger('test', __filename);

var main = function(){
	var gateServer = {host : '127.0.0.1', port : 3010};
	var connectorServer = null;

	var client = null;
	var playerId = 'p1', areaId = 'a1';

	return Q.fcall(function(){
		client = quick.mocks.client(gateServer);
		return client.connect();
	})
	.then(function(){
		return client.request('gate.gateHandler.getConnector', null);
	})
	.then(function(ret){
		connectorServer = ret;
		return client.disconnect();
	})
	.then(function(){
		// Connect to connector
		client = quick.mocks.client(connectorServer);
		return client.connect();
	})
	.then(function(){
		return client.request('player.playerHandler.create', {opts : {_id : playerId}});
	})
	.then(function(){
		var token = playerId;
		return client.request('connector.entryHandler.login', {token : token});
	})
	.then(function(){
		return client.request('area.areaHandler.create', {opts : {_id : areaId}});
	})
	.then(function(){
		return client.request('area.areaHandler.join', {areaId : areaId});
	})
	.then(function(){
		client.on('notify', function(msg){
			logger.info('on notify %j', msg);
		});
		return client.request('area.areaHandler.push', {areaId : areaId, route : 'notify', msg : 'hello', persistent : true});
	})
	.then(function(){
		return client.request('area.areaHandler.getMsgs', {areaId : areaId, seq : 0})
		.then(function(msgs){
			logger.info('%j', msgs);
		});
	})
	.then(function(){
		return client.request('area.areaHandler.quit', {areaId : areaId});
	})
	.then(function(){
		return client.request('area.areaHandler.remove', {areaId : areaId});
	})
	.then(function(){
		return client.request('player.playerHandler.remove', {});
	})
	.then(function(){
		return client.disconnect();
	})
	.catch(function(e){
		logger.error('%j', e);
	})
	.fin(function(){
		process.exit();
	});
};

if (require.main === module) {
	main();
}
