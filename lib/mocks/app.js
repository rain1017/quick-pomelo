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

var util = require('util');
var path = require('path');
var P = require('memdb-client').Promise;
var EventEmitter = require('events').EventEmitter;
var logger = require('memdb-client').logger.getLogger('test', __filename);

/*
 * @param opts.serverId
 * @param opts.components - {'name' : opts}
 * @param opts.rpc
 */
var App = function(opts){
    opts = opts || {};
    this.serverId = opts.serverId;
    this.serverType = opts.serverType;

    this.settings = {};
    this.components = {};
    this._routes = {};

    this.event = new EventEmitter();

    this._base = path.join(__dirname, '../..');
};

var proto = App.prototype;

proto.start = function(cb){
    P.bind(this)
    .then(function(){
        return P.promisify(this.optComponents, this)('start');
    })
    .then(function(){
        return P.promisify(this.optComponents, this)('afterStart');
    })
    .nodeify(cb);
};

proto.stop = function(force, cb){
    P.bind(this)
    .then(function(){
        return P.promisify(this.optComponents, this)('beforeStop');
    })
    .then(function(){
        return P.promisify(this.stopComponents, this)(force);
    })
    .nodeify(cb);
};

proto.load = function(component, opts){
    var instance = component(this, opts);
    this.components[instance.name] = instance;
};

proto.optComponents = function(method, cb){
    P.bind(this)
    .then(function(){
        return Object.keys(this.components);
    })
    .map(function(name){
        var component = this.components[name];
        if(typeof(component[method]) === 'function'){
            return P.promisify(component[method], component)();
        }
    })
    .nodeify(cb);
};

proto.stopComponents = function(force, cb){
    if(typeof(force) === 'function'){
        cb = force;
        force = false;
    }

    P.bind(this)
    .then(function(){
        return Object.keys(this.components);
    })
    .map(function(name){
        var component = this.components[name];
        if(typeof(component.stop) === 'function'){
            return P.promisify(component.stop, component)(force);
        }
    })
    .nodeify(cb);
};

proto.getServerId = function(){
    return this.serverId;
};

proto.getServerType = function(){
    return this.serverType;
};

proto.get = function(name){
    return this.settings[name];
};

proto.set = function(name, value, attach){
    this.settings[name] = value;
    if(attach){
        this[name] = value;
    }
};

proto.getBase = function(){
    return this._base;
};

proto.setBase = function(basePath){
    this._base = basePath;
};

proto.route = function(serverType, fn){
    this._routes[serverType] = fn;
};

proto.rpcInvoke = function(serverId, opts, cb){
    logger.info('rpcInvoke %s %j', serverId, opts);
    cb(null);
};

module.exports = function(opts){
    return new App(opts);
};

