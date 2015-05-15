'use strict';

var P = require('bluebird');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);
var pomeloClient = require('./pomelo-client');

var Client = function(opts){
    this.client = pomeloClient();
    this.opts = opts;
};

var proto = Client.prototype;

proto.connect = function(){
    var self = this;
    return new P(function(resolve, reject){
        self.client.init(self.opts, function(data){
            if(!!data){
                resolve(data);
            }
            else{
                reject(new Error('connect failed'));
            }
        });
    });
};

proto.disconnect = function(){
    this.client.disconnect();
};

proto.request = function(route, msg){
    msg = msg || {};
    var self = this;
    return new P(function(resolve, reject){
        self.client.request(route, msg, function(ret){
            if(ret.code === 500){
                logger.error('response %s %j => %j', route, msg, ret);
                reject(ret);
            }
            else{
                logger.info('response %s %j => %j', route, msg, ret);
                resolve(ret);
            }
        });
    });
};

proto.notify = function(route, msg){
    this.client.notify(route, msg);
};

proto.on = function(route, fn){
    this.client.on(route, fn);
};

module.exports = function(opts){
    return new Client(opts);
};
