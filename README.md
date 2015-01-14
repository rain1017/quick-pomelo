# quick-pomelo
Rapid game server framework based on pomelo

## Why Quick?

Developing in quick-pomelo is extremely simple and scalable

### Live auto scale

Server cluster can be horizontally scaled up and down, lively and transparenty, without shuting down.
Player data can 'fly' from one physical server to another, without breaking player connection, completely unnoticable by player.

### Extrme performance

All data is performed in local server memory and synced to database on demand

### Simple and intuitive

All api handlers is performed single threaded.

No async, No callback hell, No lock required.

Database access is controlled by framework, no explicit code required to access database.

## Quick Sample

```
// Implement API
handlers['levelup'] = function(opts){
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

### Area Service

### Server Allocator (Load Balancer)

### Area Index

### Area Allocator

### Player Index

### Area Proxy

### Entry
