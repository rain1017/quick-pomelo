'use strict';

var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;

var schema = new Schema({
	_id: {type: String, index: true},
	_server: {type: String, index: true, default: null},
}, {collection : 'areas', versionKey : '__v', discriminatorKey : '__t'});

module.exports = schema;
