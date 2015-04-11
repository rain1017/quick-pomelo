'use strict';

var logger = require('pomelo-logger').getLogger('memorydb', __filename);
var Q = require('q');
var path = require('path');
var requireChildren = require('../../utils/require-children');
var memorydb = require('memorydb');

var DEFAULT_MODELS_PATH = 'app/models';

var MemoryDB = function(app, opts){
	this.app = app;
	this.config = app.get('memorydbConfig') || opts || {};
	this.config.modelsPath = this.config.modelsPath || DEFAULT_MODELS_PATH;
};

var proto = MemoryDB.prototype;

proto.name = 'memorydb';

proto.start = function(cb){
	var self = this;
	return Q.fcall(function(){
		var basePath = path.join(self.app.getBase(), self.config.modelsPath);
		return self.loadModels(basePath);
	})
	.then(function(){
		return self.parseSchemas(self.config);
	})
	.then(function(){
		return memorydb.startServer(self.config);
	})
	.nodeify(cb);
};

proto.stop = function(force, cb){
	var self = this;

	this.unregisterModels();

	return Q.fcall(function(){
		return memorydb.stopServer();
	})
	.nodeify(cb);
};

proto.connect = function(){
	return memorydb.connect();
};

proto.autoConnect = function(){
	return memorydb.autoConnect();
};

proto.loadModels = function(basePath){
	var modules = requireChildren(module, basePath);

	var self = this;
	Object.keys(modules).forEach(function(name){
		modules[name](self.app);
	});
};

proto.parseSchemas = function(config){
	if(!config.collections){
		config.collections = {};
	}

	var collections = config.collections;
	var mdbgoose = this.goose;

	for(var name in mdbgoose.models){
		this.app.models[name] = mdbgoose.model(name);

		var model = mdbgoose.models[name];
		var schema = model.schema;
		var collname = model.collection.name;

		if(!collections.collname){
			collections[collname] = {};
		}
		var paths = schema.paths;
		for(var field in paths){
			if(field === '_id' || field.indexOf('.') !== -1){
				continue; //ignore compound field and _id
			}
			if(paths[field]._index === true){
				if(!collections[collname].indexes){
					collections[collname].indexes = [];
				}
				collections[collname].indexes.push(field);
			}
		}
		//Disable versionkey
		schema.options.versionKey = false;
	}
};

// Unregister mongoose models
// WARN: It is not a official supported behavier
proto.unregisterModels = function(){
	var models = this.goose.connection.models;
	Object.keys(models).forEach(function(name){
		delete models[name];
	});
};

Object.defineProperty(proto, 'goose', {
	get : function(){
		return memorydb.goose;
	}
});

module.exports = function(app, opts){
	var db = new MemoryDB(app, opts);
	app.set(db.name, db, true);
	app.set('models', {}, true);
	return db;
};
