// Copyright 2015 rain1017.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License. See the AUTHORS file
// for names of contributors.

'use strict';

var path = require('path');
var requireChildren = require('../../utils/require-children');
var memdb = require('memdb-client');
var P = memdb.Promise;
var logger = memdb.logger.getLogger('memdb-client', __filename);

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
        return this.goose.connect(this.config);
    })
    .nodeify(cb);
};

proto.stop = function(force, cb){
    this.unregisterModels();

    return P.bind(this)
    .then(function(){
        return this.goose.disconnect();
    })
    .nodeify(cb);
};

proto.loadModels = function(basePath){
    var modules = requireChildren(module, basePath);

    var self = this;
    Object.keys(modules).forEach(function(name){
        modules[name](self.app);
    });

    var mdbgoose = this.goose;
    for(var name in mdbgoose.models){
        var model = mdbgoose.model(name);
        model.schema.options.versionKey = false; //disable versionKey
        this.app.models[name] = model;
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

Object.defineProperty(proto, 'autoconn', {
    get : function(){
        return memdb.goose.autoconn;
    }
});

module.exports = function(app, opts){
    var db = new MemDB(app, opts);
    app.set(db.name, db, true);
    app.set('models', {}, true);
    return db;
};
