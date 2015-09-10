# quick-pomelo ![logo](https://github.com/rain1017/memdb/wiki/images/logo.png)

[![Build Status](https://travis-ci.org/rain1017/quick-pomelo.svg?branch=master)](https://travis-ci.org/rain1017/quick-pomelo)
[![Dependencies Status](https://david-dm.org/rain1017/quick-pomelo.svg)](https://david-dm.org/rain1017/quick-pomelo)

__Scalable, Transactional and Reliable Game Server Framework based on Pomelo and MemDB__

### Performance and Scalable
* Fast in-memory data access.
* Distributed architecture, system capacity is horizontally scalable. Performance can be linearly increased by simply add more servers.

### Distributed ACID Transaction
* [ACID](https://en.wikipedia.org/wiki/ACID)(Stands for Atomicity, Consistency, Isolation, Durability) transaction support on distributed environment.
* Data atomicity and consistency guarantee, never leave dirty data in memory.
* Concurrency and locking control, which make it very easy to write concurrency code. High performance on concurrent system.

### High Availability
* Each server is backed by one or more replica, no single point of failure.

### MVC Architecture
* Simple and clear Module-Controller architecture.
* Use [Mongoose](http://mongoose.com) to define data models.

### ES6 Promise Supported
* Promise A+ compatible
* Support ES6 generators (yield)

### Powerful Built-in Modules
* Very powerful built-in modules, like push module. You can build a full featured push/chat service with almost zero code.

## Links

* Home Page: [http://www.quickpomelo.com](http://www.quickpomelo.com)
* Github: [https://github.com/rain1017/quick-pomelo](https://github.com/rain1017/quck-pomelo)
* Wiki: [https://github.com/rain1017/quick-pomelo/wiki](https://github.com/rain1017/quick-pomelo/wiki)
* Demo Game: [https://github.com/rain1017/quick-pomelo-demo](https://github.com/rain1017/quick-pomelo-demo)
* Email: [rain1017@gmail.com](mailto:rain1017@gmail.com)

## Quick Start

### Prerequisites

#### [Pomelo](https://github.com/NetEase/pomelo)

Quick-pomelo is based on pomelo, have a draft idea of pomelo framework is required.

#### [MemDB](https://github.com/rain1017/memdb)

Quick-pomelo use memdb for underlaying data storage, so understanding memdb is required.

### Install dependencies

* Install [Node.js](https://nodejs.org/download)
* Install [Redis](http://redis.io/download) (required for memdb)
* Install [MongoDB](https://www.mongodb.org/downloads) (required for memdb)
* Install [MemDB](https://github.com/rain1017/memdb) globally
```
sudo npm install -g memdb-server
```
* Install pomelo globally
```
sudo npm install -g rain1017/pomelo
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

Before start
* Make sure Redis and MongoDB has started.
* Copy `./config/memdb.conf.js` to `~/.memdb/` (mkdir if not exist)
* Start memdb cluster
```
memdbcluster start
```

Start server
```
pomelo start --harmony
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

Copyright 2015 rain1017.

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
