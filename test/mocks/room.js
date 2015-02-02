'use strict';

var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);
var Area = require('../../lib').area;

var Room = function(){
	Area.apply(this, [].slice.call(arguments));
};

util.inherits(Room, Area);

Room.schema = Area.schema.extend({
	name : String,
});

var proto = Room.prototype;

proto.onInit = function(opts){
	opts = opts || {};
	this.name = opts.name || 'No name';
};

proto.onDestroy = function(){

};

proto.onSerialize = function(doc){
	doc.name = this.name;
};

proto.onDeserialize = function(doc){
	this.name = doc.name;
};

proto.onStart = function(){

};

proto.onStop = function(){

};

proto.onJoin = function(playerId){

};

proto.onQuit = function(playerId){

};

proto.beforeJoin = function(playerId){

};

proto.beforeQuit = function(playerId){

};

proto.test = function(){
	logger.debug('room.test %s', [].slice.apply(arguments));
};

module.exports = Room;
