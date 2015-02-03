'use strict';

var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;

var schema = new Schema({
	__t: {type: String, index: true},
	_id: {type: String, index: true},
	_server: {type: String, index: true, default: null},
	_flush: {type: Number, default: 0}, //flush interval in ms
}, {collection : 'areas', versionKey : '__v', discriminatorKey : '__t'});

module.exports = schema;
