'use strict';
/* global app */

/**
 * Sample pomel-cli script
 */

var Q = require('q');

Q.fcall(function(){
	return app.areaManager.createArea('area1', 'room', {name : 'new room'});
})
.delay(5 * 1000)
.then(function(){
	return app.areaManager.invokeArea('area1', 'test', ['arg1', 'arg2']);
})
.delay(5 * 1000)
.then(function(){
	app.areaManager.removeArea('area1');
});
