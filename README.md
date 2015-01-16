# quick-pomelo
Rapid game server framework based on pomelo

## Why Quick?

Developing in quick-pomelo is extremely simple and scalable

### Simple and intuitive

All api handlers is performed single threaded.

No async, No callback hell, No lock required.

Database access is controlled by framework, no explicit code required to access database.

### Extreme performance

All data is performed in local server memory and synced to database on demand

### Scalable and robostness

Server cluster can be horizontally scaled up and down, lively and transparently, without shuting down.
Player data can 'fly' from one physical server to another, without breaking player connection, completely unnoticable by player.


## Quick Sample

```
// Implement AP
area.handlers['levelup'] = function(opts){
	var player = area.players[opts.id];

	// Change data in memory
	player.level += 1;
	player.money += 10;
	
	// Notify all players in area
	area.notifyAll('levelup', {'playerId' : opts.id});

	// Notify player only
	player.notify('money', player.money);
};
```

## Core components

### Area
* Area is container of players, like a 'map' in RPG game or a 'room' in card game.
* Most of time, player only need to communicate with players in the same area. In area communication is synchronous and single threaded local memory operation which can maximize performance and minimize complication.

###	Area Server
* Container of areas. One server can load multiple areas depend on hardware resources.

### Auto Scaling
Assigning areas to servers based on server topology and server load. Area will be moved to other servers on host server failure. New server can be added dynamically.

### Area Proxy
Cross area communication.
If the target area is in the same server, it will be called directly. Otherwise, a rpc will be made to target server.
The proxy maintains a cache of areaIndex and playerIndex in local memory to speedup index querying.
Cross area communication has performance penalty and should be used with care.

### Area2Server Index
Mapping from area to server, based on redis. Index is __Single Source of Truth__, all other components should refer to this index to maintain data consistency in the cluster.

### Player2Server Index
Mapping from player to area, based on redis. Index is __Single Source of Truth__, all other components should refer to this index to maintain data consistency in the cluster.

### Area Manager
* Area statistics.
* Create or destroy area.
* Player join and quit area.

