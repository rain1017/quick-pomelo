'use strict';

var P = require('bluebird');
P.longStackTraces();
var should = require('should');
var path = require('path');
var quick = require('quick-pomelo');
var logger = require('pomelo-logger').getLogger('test', __filename);

var env = {};

Object.defineProperty(env, 'dbConfig', {
    get : function(){
        return {
            shard : 's1',
            redis : {host : '127.0.0.1', port : 6379, db : 1},
            backend : {engine : 'mongodb', url : 'mongodb://localhost/quick-pomelo-test'},
            slave : {host : '127.0.0.1', port : 6379, db : 1},
        };
    }
});

env.createApp = function(serverId, serverType){
    var app = quick.mocks.app({serverId : serverId, serverType : serverType});

    app.setBase(path.join(__dirname, '..'));
    app.set('memdbConfig', env.dbConfig);

    app.load(quick.components.memdb);
    app.load(quick.components.controllers);
    return app;
};

env.dropDatabase = function(dbConfig, cb){
    if(typeof(dbConfig) === 'function'){
        cb = dbConfig;
        dbConfig = env.dbConfig;
    }

    logger.debug('start dropDatabase');
    return P.try(function(){
        return env.dropRedis(dbConfig.redis);
    })
    .then(function(){
        return env.dropRedis(dbConfig.slave);
    })
    .then(function(){
        return env.dropMongo(dbConfig.backend);
    })
    .then(function(){
        logger.debug('done dropDatabase');
    })
    .nodeify(cb);
};

env.dropRedis = function(redisConfig){
    var client = require('redis').createClient(redisConfig.port, redisConfig.host);
    client.select(redisConfig.db);
    return P.try(function(){
        return P.promisify(client.flushdb, client)();
    })
    .then(function(){
        client.quit();
    });
};

env.dropMongo = function(mongoConfig){
    var db = null;
    return P.try(function(){
        var client = require('mongodb').MongoClient;
        return P.promisify(client.connect, client)(mongoConfig.url, mongoConfig.options);
    })
    .then(function(ret){
        db = ret;
        return P.promisify(db.dropDatabase, db)();
    })
    .then(function(){
        return P.promisify(db.close, db)();
    });
};

module.exports = env;
