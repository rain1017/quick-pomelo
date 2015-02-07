'use strict';

var Q = require('q');
var util = require('util');
var Client = require('../mocks/client');
var logger = require('pomelo-logger').getLogger('test', __filename);

var client = new Client();
var gateServer = {host : '127.0.0.1', port : 3010};
var playerId = 'testPlayer';

Q.fcall(function(){
	return client.init(gateServer);
}).then(function(){
	return client.request('gate.quickHandler.getConnector', null);
}).then(function(connectorServer){
	return Q.fcall(function(){
		return client.disconnect();
	}).delay(200).then(function(){
		return client.init(connectorServer);
	});
}).then(function(){
	return client.request('connector.quickHandler.createPlayer', {opts : {_id : playerId}})
	.catch(function(e){
		//ignore error
	});
}).then(function(){
	var auth = playerId;
	return client.request('connector.quickHandler.login', {auth : auth});
}).delay(500).then(function(){
	return client.request('connector.quickHandler.logout');
}).then(function(){
	return client.request('connector.quickHandler.removePlayer', {playerId : playerId});
}).then(function(){
	return client.disconnect();
}).catch(function(e){
	logger.error(e.stack);
}).done(function(){
	process.exit();
});
