'use strict';

var logger = require('pomelo-logger').getLogger('memdb', __filename);
var P = require('bluebird');
var path = require('path');
var requireChildren = require('../../utils/require-children');
var memdb = require('memdb');

var DEFAULT_MODELS_PATH = 'app/models';

var MemDB = function(app, opts){
	this.app = app;
	this.config = app.get('memdbConfig') || opts || {};
	this.config.modelsPath = this.config.modelsPath || DEFAULT_MODELS_PATH;
};

var proto = MemDB.prototype;

proto.name = 'memdb';

proto.start = function(cb){
	return P.bind(this)
	.then(function(){
		var basePath = path.join(this.app.getBase(), this.config.modelsPath);
		return this.loadModels(basePath);
	})
	.then(function(){
		return this.parseSchemas(this.config);
	})
	.then(function(){
		return memdb.startServer(this.config);
	})
	.nodeify(cb);
};

proto.stop = function(force, cb){
	var self = this;

	this.unregisterModels();

	return P.try(function(){
		return memdb.stopServer();
	})
	.nodeify(cb);
};

proto.connect = function(){
	return memdb.connect();
};

proto.autoConnect = function(){
	return memdb.autoConnect();
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
		return memdb.goose;
	}
});

module.exports = function(app, opts){
	var db = new MemDB(app, opts);
	app.set(db.name, db, true);
	app.set('models', {}, true);
	return db;
};
