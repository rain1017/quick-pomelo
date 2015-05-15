# quick-pomelo
Rapid and robust game server framework based on pomelo and memdb

## Why Quick?

- [x] __Performance__ : Data access is mainly based on in process memory, which is extremely fast.

- [x] __Scalable__ : System is horizontally scalable, you can simplely add more servers to increase system capacity.

- [x] __Transaction__ : Full transaction support like traditional database, data consistency is guaranteed.

- [x] __High Availability__ : Each server is backed by one or more replica, you will never lose any commited data.

## Prerequisties

### [Pomelo](https://github.com/NetEase/pomelo)
A fast, scalable, distributed game server framework for Node.js.

Quick-pomelo is based on pomelo, you should first understand the pomelo framework.

### [MemDB](https://github.com/rain1017/memdb)
Distributed transactional in memory database.

Quick-pomelo use memdb to manage data model and data access, so understanding memdb is required.

## Documents

### [The Wiki](https://github.com/rain1017/quick-pomelo/wiki)
### [Demo Game(斗地主)](https://github.com/rain1017/quick-pomelo-demo)

## Quick Start

### Start with template

First copy the template to your working directroy. The template contains most common skeletons for a quick-pomelo game server.

### Install dependencies

* Install [Node.js v0.12](https://nodejs.org/download/)
* Install [Redis](http://redis.io/download)
* Install [MongoDB](https://www.mongodb.org/downloads)
* Install node dependencies
```
npm install
```

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

proto.removePlayer = function(playerId){
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
node app.js
```

__Well done! Congratulations!__


## Quick's Philosophy

A typical realtime game server framework is stateful for the sake of performance, all states is kept in server local memory. However, this approach has significant drawbacks:

- Any exceptions (may be caused by bugs or unexpected client input) may result in non-consistent state (half-modified dirtydata), which is very difficult to recover
- Concurrency control is very difficult to implement
- We must remember which server the data is located, and use rpc to get data, which is errorprone.
- In memory data will be lost on server failure, it's very difficult to support HA

Thanks to [memdb](http://memdb.org), quick pomelo un-invent the stateful approach and use a web server like 'MVC' based architecture. All servers become stateless and all states is stored in memdb. You can now get all benifits from a typical stateless web server, without losing performance and scalibility of in memory stateful server.

