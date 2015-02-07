'use strict';

var Q = require('q');

var wait = function(testFunc, interval, timeout){
	return Q.fcall(function(){
		return testFunc();
	}).then(function(ret){
		if(!!ret){
			return;
		}
		if(timeout < interval){
			throw new Error('Wait timed out');
		}
		return Q().delay(interval).fcall(function(){ // jshint ignore:line
			return wait(testFunc, interval, timeout - interval);
		});
	});
};

module.exports = {
	wait : wait
};
