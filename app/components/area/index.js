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

areaSchema.methods.invoke = function(method, opts){
	logger.info('area[%s].invoke\t%s\t%s', this._id, method, opts);
	// return a value or a promise
};


var Area = mongoose.model('area', areaSchema);

module.exports = Area;
