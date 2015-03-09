'use strict';

var Q = require('q');
var path = require('path');
var requireDirectory = require('require-directory');
var memorydb = require('memorydb');

var DEFAULT_MODEL_PATH = 'app/models';

var MemoryDB = function(app, opts){
	this.app = app;
	this.config = app.get('memorydbConfig') || {};
	this.config.modelPath = this.config.modelPath || DEFAULT_MODEL_PATH;
};

var proto = MemoryDB.prototype;

proto.name = 'memorydb';

proto.start = function(cb){
	var self = this;
	return Q.fcall(function(){
		var basePath = path.join(self.app.getBase(), self.config.modelPath);
		return self.loadModels(basePath);
	})
	.then(function(){
		return self.parseSchemas(self.config);
	})
	.then(function(){
		return memorydb.start(self.config);
	})
	.nodeify(cb);
};

proto.stop = function(force, cb){
	var self = this;
	return Q.fcall(function(){
		return memorydb.stop();
	})
	.nodeify(cb);
};

proto.connect = function(){
	return memorydb.connect();
};

proto.autoConnect = function(){
	return memorydb.autoConnect();
};

proto.goose = function(){
	return memorydb.goose();
};

proto.loadModels = function(basePath){
	var modules = requireDirectory(module, basePath, {recurse: false});

	var self = this;
	Object.keys(modules).forEach(function(name){
		if(name === 'index'){
			return;
		}
		modules[name](self.app);
	});
};

proto.parseSchemas = function(config){
	if(!config.collections){
		config.collections = {};
	}
	var collections = config.collections;
	var mdbgoose = this.goose();
	var schemas = mdbgoose.modelSchemas;

	for(var name in schemas){

		this.app.models[name] = mdbgoose.Model(name);

		if(!collections.name){
			collections[name] = {};
		}
		var paths = schemas[name].paths;
		for(var field in paths){
			if(field === '_id' || field.find('.') !== -1){
				continue; //ignore compound field and _id
			}
			if(paths[field]._index === true){
				if(!collections[name].indexes){
					collections[name].indexes = [];
				}
				collections[name].indexes.push(field);
			}
		}
	}
};

module.exports = function(app, opts){
	var db = new MemoryDB(app, opts);
	app.set(db.name, db, true);
	app.set('models', {}, true);
	return db;
};
