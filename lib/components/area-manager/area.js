'use strict';

var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;
var logger = require('pomelo-logger').getLogger('area', __filename);

// @param doc - mongodb document based on Area.schema
var Area = function(doc){
	this._id = doc._id;
	this.players = {};
};

Area.schema = new Schema({
	_id: {type: String, index: true},
	_server: {type: String, index: true, default: null},
}, {collection : 'areas', versionKey : '__v', discriminatorKey : '__t'});

var proto = Area.prototype;

// @param doc - mongodb document based on Area.schema
proto.toDoc = function(doc){

};

proto.start = function(){
	//load players
	logger.debug('area %s start', this._id);
};

proto.stop = function(){
	//release players
	logger.debug('area %s stop', this._id);
};

proto.connect = function(playerId){

};

proto.disconnect = function(playerId){

};

module.exports = Area;
