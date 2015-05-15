# quick-pomelo
Rapid and robust game server framework based on pomelo and memdb

## Why Quick?

- [x] __Performance__ : Data access is mainly based on in process memory, which is extremely fast.

- [x] __Scalable__ : System is horizontally scalable, you can simply add more servers to increase system capacity.

- [x] __Transaction__ : Full transaction support like traditional database, data consistency is guaranteed.

- [x] __High Availability__ : Each server is backed by one or more replica, you will never lose any committed data.

## Documents

### [The Wiki](https://github.com/rain1017/quick-pomelo/wiki)
### [Demo Game(斗地主)](https://github.com/rain1017/quick-pomelo-demo)

## Quick Start

### Prerequisites

#### [Pomelo](https://github.com/NetEase/pomelo)

Quick-pomelo is based on pomelo, you should first understand the pomelo framework.

#### [MemDB](https://github.com/rain1017/memdb)

Quick-pomelo use memdb to manage data model and data access, so understanding memdb is required.

### Install dependencies

* Install [Node.js v0.12](https://nodejs.org/download)
* Install [Redis](http://redis.io/download)
* Install [MongoDB](https://www.mongodb.org/downloads)

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
        areaId : {type : String, index : true},
        teamId : {type : String, index : true},
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
    var player = yield this.app.models.Player.findLockedAsync(playerId);
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
```
npm install
node app.js
```

### Well done! Congratulations!


## Quick's Philosophy

A typical realtime game server framework is stateful for the sake of performance, all states is kept in server local memory. However, this approach has significant drawbacks:

- Any exceptions (may be caused by bugs or unexpected client input) may result in non-consistent state (half-modified dirty data), which is very difficult to recover
- Concurrency control is very difficult to implement
- We must remember which server the data is located, and use rpc to get data, which is error prone.
- In memory data will be lost on server failure, it's very difficult to support HA

Thanks to [memdb](http://memdb.org), quick pomelo un-invent the stateful approach and use a web server like 'MVC' based architecture. All servers become stateless and all states is stored in memdb. You can now get all benefits from a typical stateless web server, without losing performance and scalability of in memory stateful server.


## License
(The MIT License)

Copyright (c) 2015 rain1017

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
