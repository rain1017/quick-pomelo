'use strict';

var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;

var schema = new Schema({
	_id: {type: String, index: true},
	_area: {type: String, index: true, default: null},
	_connector: {type: String, default: null},
}, {collection: 'players', versionKey : '__v', discriminatorKey : '__t'});

schema.methods.isConnected = function(){
	return !!this._connector;
};

module.exports = {
	schema : schema
};
