// Copyright 2015 MemDB.
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

var P = require('memdb-client').Promise;
var logger = require('memdb-client').logger.getLogger('transaction', __filename);

var Filter = function(app) {
    this.app = app;
};

Filter.prototype.before = function(msg, session, next) {
    var goose = this.app.memdb.goose;

    var deferred = P.defer();
    session.__transaction__ = deferred;

    var startTick = Date.now();
    var self = this;

    goose.transaction(function(){
        next();
        return deferred.promise;
    }, this.app.getServerId())
    .then(function(ret){
        try{
            self.app.event.emit('transactionSuccess');
        }
        catch(err){
            logger.error(err.stack);
        }
        logger.info('%j => %j (%sms)', msg, ret, Date.now() - startTick);
    }, function(e){
        try{
            self.app.event.emit('transactionFail');
        }
        catch(err){
            logger.error(err.stack);
        }
        logger.error('%j => %j (%sms)', msg, e.stack, Date.now() - startTick);
    });
};

Filter.prototype.after = function(err, msg, session, resp, next) {
    var deferred = session.__transaction__;
    if(err){
        deferred.reject(err);
    }
    else{
        deferred.resolve(resp);
    }
    next(err);
};

module.exports = function(app) {
    return new Filter(app);
};
