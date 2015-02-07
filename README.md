# quick-pomelo
Rapid game server framework based on pomelo

## Why Quick?

Developing in quick-pomelo is extremely simple and scalable

### Simple Simple Simple!

* Dedicated database access, no explicit db access required
* Dedicated concurrency control, no explicit synchronization required
* Promise based async code, no callback hell

### Performance and AutoScaling

All data is performed in local server memory and synced to database on demand

Server cluster is horizontally scaled up and down, automatically, lively and transparently.
Player live data can 'fly' from one server to another, without breaking connection, without losing running state.


## Quick Sample

```
Area.prototype.levelup = function(playerId){
	var player = this.getPlayer(playerId);

	// Change data in memory
	player.level += 1;
	player.money += 10;
	
	// Notify all players in area
	this.notifyAll('levelup', {'playerId' : playerId});

	// Notify player only
	this.notify(playerId, 'money', player.money);

	// You can finally return a value or promise
};
```

## Core components

### Area
* Area is container of players, like a 'map' in RPG game or a 'room' in card game.
* Most of time, player only need to communicate with players in the same area. In area communication is synchronous and single threaded local memory operation which can maximize performance and minimize complication.

###	Area Server
* Container of areas. One server can load multiple areas depend on hardware resources.

### Area Backend
Access center database.

Area backend is loaded on each server and it does not hold any state in local memory.

* DB Access

Create/Remove/Load/Save area to mongodb.

* Area Locks

The are lock indicates which areaServer 'owns' the area currently, and an areaServer must hold the global area lock in order to load/save area.
The lock is saved as a field of mongodb area schema (Area._server).

### Area Proxy

Dispatch requests to areaServers, all cross area request must via areaProxy.

Area proxy is loaded on each server and it does not hold any state in local memory.

* Cross area communication

If the target area is in the same server, it will be called directly. Otherwise, a rpc will be made to target server.
Cross area communication has performance penalty and should be used with care.

* Index cache

A cache of area -> serverId index in local memory in order to speedup index querying.

### Auto Scaling
Assigning areas to servers based on server topology and server load average.
Area server is 'hot plugable'. When more compute resource is needed, more area server can be plugged into cluster.

The load balancer algorithm is defined by the following principles:
* New area always load to the server with the lowest load average
* Area stays in one server until the load average of the server exceed limit or the server is down.
* When the system total load exceed certain limit (total load is the sum of load average of all servers), the cluster should scale up by add more servers.
* When the system total load below certain limit, the cluster should scale down by turn of servers with lowest load.

### Player

### Player Backend

### Player Proxy

### Objects (Player & Area)

Life cycle:
create: new -> init -> serialize
update: new -> deserialize -> start -> running -> serialize -> stop
remove: running -> stop -> destroy

Concurrency:
Methods in the same object (Identified by area._id or player._id) is guaranteed to be called in serial, so no synchronization required for user code.

### Default Area
