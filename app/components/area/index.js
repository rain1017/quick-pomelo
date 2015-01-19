'use strict';

var logger = require('pomelo-logger').getLogger('area', __filename);

var Area = function(opts){
	opts = opts || {};

	this.id = opts.id;
};

var proto = Area.prototype;

proto.invoke = function(method, opts){
	logger.info('area[%s].invoke\t%s\t%s', this.id, method, opts);

	// return a value or a promise
};

module.exports = Area;
