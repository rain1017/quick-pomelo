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

var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

var main = function(){
    var connector1 = {host : '127.0.0.1', port : 3100};
    var connector2 = {host : '127.0.0.1', port : 3101};

    var client1 = quick.mocks.client(connector1);
    var client2 = quick.mocks.client(connector2);
    var client3 = quick.mocks.client(connector1);
    var client4 = quick.mocks.client(connector2);

    var playerId = 'p1';

    return P.try(function(){
        return client1.connect();
    })
    .then(function(){
        return client1.request('player.playerHandler.create', {opts : {_id : playerId}});
    })
    .then(function(){
        return client1.request('connector.entryHandler.login', {token : playerId});
    })
    .then(function(){
        return client2.connect();
    })
    .then(function(){
        // Client1 should be kicked out
        return client2.request('connector.entryHandler.login', {token : playerId});
    })
    .then(function(){
        // Explicitly call logout
        return client2.request('connector.entryHandler.logout');
    })
    .then(function(){
        return client3.connect();
    })
    .then(function(){
        return client3.request('connector.entryHandler.login', {token : playerId});
    })
    .then(function(){
        // Auto logout on disconnect
        return client3.disconnect();
    })
    .delay(100)
    .then(function(){
        return client4.connect();
    })
    .then(function(){
        return client4.request('connector.entryHandler.login', {token : playerId});
    })
    .then(function(){
        // Remove and logout
        return client4.request('player.playerHandler.remove');
    })
    .then(function(){
        return client4.disconnect();
    })
    .catch(function(e){
        logger.error('%j', e);
    })
    .finally(function(){
        process.exit();
    });
};

if (require.main === module) {
    main();
}
