# quick-pomelo ![logo](https://github.com/memdb/memdb/wiki/images/logo.png)

[![Build Status](https://travis-ci.org/memdb/quick-pomelo.svg?branch=master)](https://travis-ci.org/memdb/quick-pomelo)
[![Dependencies Status](https://david-dm.org/memdb/quick-pomelo.svg)](https://david-dm.org/memdb/quick-pomelo)

__Scalable, transactional and reliable game server framework based on Pomelo and MemDB__

- [x] __Horizontally Scalable__ : Performance grows linearly by adding more servers.

- [x] __ACID Transaction__ : Full [ACID](https://en.wikipedia.org/wiki/ACID) transaction support on distributed environment.

- [x] __High Availability__ : Each server is backed by one or more replica, you will never lose any committed data.

- [x] __'MVC' Architecture__ : Define data model using 'mongoose'.

## [The Wiki](https://github.com/memdb/quick-pomelo/wiki)

## [Demo Game(斗地主)](https://github.com/memdb/quick-pomelo-demo)

## Quick Start

### Prerequisites

#### [Pomelo](https://github.com/NetEase/pomelo)

Quick-pomelo is based on pomelo, have a draft idea of pomelo framework is required.

#### [MemDB](https://github.com/memdb/memdb)

Quick-pomelo use memdb for underlaying data storage, so understanding memdb is required.

### Install dependencies

* Install [Node.js](https://nodejs.org/download)
* Install [Redis](http://redis.io/download) (required for memdb)
* Install [MongoDB](https://www.mongodb.org/downloads) (required for memdb)
* Install [MemDB](https://github.com/memdb/memdb)
```
sudo npm install -g memdb-server
```

### Start with template

First copy the template to your working directory. The template contains most common skeletons for a quick-pomelo game server.


### Define models

Define data models in app/models directory

```js
// app/models/player.js
module.exports = function(app){
    var mdbgoose = app.memdb.goose;

    var PlayerSchema = new mdbgoose.Schema({
        _id : {type : String},
        areaId : {type : String},
        teamId : {type : String},
        connectorId : {type : String},
        name : {type : String},
    }, {collection : 'players'});

    mdbgoose.model('Player', PlayerSchema);
};
```

### Write controllers 

Write controllers in app/controllers directory

```js
// app/controllers/player.js
var Controller = function(app){
    this.app = app;
};

var proto = Controller.prototype;

proto.createPlayerAsync = function(opts){
    // Get model by this.app.models.[model]
    var player = new this.app.models.Player(opts);
    yield player.saveAsync();
};

proto.removePlayerAsync = function(playerId){
    var player = yield this.app.models.Player.findAsync(playerId);
    if(!player){
        throw new Error('player not exist');
    }
    yield player.removeAsync();
};

module.exports = function(app){
    return new Controller(app);
};
```

### Define routes

For each type of server, write a route in app/routes directory.

```js
// app/routes/player.js
module.exports = {
    // Routing in handler
    handler : function(session, method, msg){
        // Return a string routing key
        // Same routing key always route to the same backend server.
        return session.uid || msg.playerId;
    },
    // Routing in remote
    remote : function(routeParam, method, args){
        return routeParam;
    }
};
```

### Write server handlers

Write server handlers in app/servers/[server]/handler

```js
// app/servers/player/playerHandler.js
var Handler = function(app){
    this.app = app;
};

Handler.prototype.createPlayer = function(msg, session, next){
    // Get controller by this.app.controllers.[controler]
    return this.app.controllers.player.createPlayerAsync(msg.opts)
    .nodeify(next); 
};

module.exports = function(app){
    return new Handler(app);
};
```

### Start server
Start memdb cluster
```
memdbcluster start --conf=[memdb.conf.js]
```
Start quick pomelo server
```
pomelo start
```

### Well done! Congratulations!


## Quick's Philosophy

A typical realtime game server framework is stateful for the sake of performance, all states is kept in server local memory. However, this approach has significant drawbacks:

- Any exceptions (may be caused by bugs or unexpected client input) may result in non-consistent state (half-modified dirty data), which is very difficult to recover
- Concurrency control is very difficult to implement
- We must remember which server the data is located, and use rpc to get data, which is error prone.
- In memory data will be lost on server failure, it's very difficult to support HA

Thanks to [MemDB](http://memdb.org), quick pomelo un-invent the stateful approach and use a web server like 'MVC' based architecture. All servers become stateless and all states is stored in memdb. You can now get all benefits from a typical stateless web server, without losing performance and scalability of in memory stateful server.


## License

Copyright 2015 MemDB.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing
permissions and limitations under the License. See the AUTHORS file
for names of contributors.
