# quick-pomelo
Rapid and robust game server framework based on pomelo and memdb

## Why Quick?

### Performance and Scalable

Data access is in local memory for most situations, which is extremely fast.

Server cluster is horizontally scalable, you can simplely add more servers to increase system capacity.

### Transaction and Concurrency safe

All data access inside a request is transaction guarded,
changes will be either commited or rolledback (on exception) after one request. There is no chance to left dirty half-modified data.

Document (like mysql's row) based locking mechanism is used to control concurrency.

### High Availability

All server (which perserve memdb's data) is backed by one or more redis replication. All commited data can be restored after server failure. You will never lose any commited data.

## Quick's Philosophy

A typical realtime game server framework is stateful (for performance), all states is kept in server local memory. However, this approach has significant drawbacks:

1. Any exceptions (may be caused by bugs or unexpected client input) may result in non-consistent state (half-modified dirtydata), which is very difficult to recover.
2. User must call specific server to access data, and in-request rpc is errorprone.
3. In memory data will be lost on server failure, it's very difficult to support HA.

Thanks to memdb, quick pomelo un-invent the stateful approach and use a web server like 'MVC' based architecture. All servers become stateless and all states is stored in memdb. You can now get all benifits from a typical stateless web server, without losing performance and scalibility of in memory stateful server (As long as you access same data from the same server). [read more about memdb](https://github.com/rain1017/memdb).

## Quick Sample

```
TBD
```

## Get Started

You can start your project with the template and modify it on your need. The template contains most common skeletons for a quick-pomelo game server.
