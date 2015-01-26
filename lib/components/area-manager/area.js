'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var logger = require('pomelo-logger').getLogger('area', __filename);

var areaSchema = new Schema({
	_id: {type: String, index: true},
	_serverId: {type: String, index: true, default: null},
	_type: {type: String, index: true},
	name: String,
});

//areaSchema.set('autoIndex', false);

areaSchema.methods.test = function(){
	logger.info('area[%s].test\t%s', this._id, [].slice.call(arguments));
	// return a value or a promise
};

module.exports = areaSchema;
