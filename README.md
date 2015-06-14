# quick-pomelo
Rapid and robust game server framework based on pomelo and memdb

## Why Quick?

- [x] __Performance__ : In memory data access which is extremely fast.

- [x] __Scalable__ : System is horizontally scalable, you can simply add more servers to increase system capacity.

- [x] __Transaction__ : Full transaction support like traditional database, data consistency is guaranteed.

- [x] __High Availability__ : Each server is backed by one or more replica, you will never lose any committed data.

- [x] __'MVC' Architecture__ : Define data model using 'mongoose'.

## Documents

* __[The Wiki](https://github.com/rain1017/quick-pomelo/wiki)__

## Demos

* __[Demo Game(斗地主)](https://github.com/rain1017/quick-pomelo-demo)__

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
* Install [MemDB](https://github.com/rain1017/memdb)
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
memdbcluster start --conf=[path to .memdb.js]
```
Start quick pomelo server
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

Quick Pomelo - Rapid and robust game server framework based on pomelo and memdb

Copyright (C) rain1017

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
