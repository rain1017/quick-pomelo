'use strict';
/* global app */

/**
 * Sample pomel-cli script
 */

var Q = require('q');

Q.fcall(function(){
	return app.areaManager.createArea({_id : 'area1', name : 'new room'}, 'room');
})
.delay(1000)
.then(function(){
	return app.areaManager.invokeArea('area1', 'test', ['arg1', 'arg2']);
})
.delay(1000)
.then(function(){
	return app.areaManager.removeArea('area1');
})
.delay(1000)
.then(function(){
	return app.playerManager.createPlayer({_id : 'player1', name : 'name'});
})
.delay(1000)
.then(function(){
	return app.playerManager.invokePlayer('player1', 'test', ['arg1', 'arg2']);
})
.delay(1000)
.then(function(){
	return app.playerManager.removePlayer('player1');
});
