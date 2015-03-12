# quick-pomelo
Rapid and robust game server framework based on pomelo and memorydb

## Why Quick?

### Performance and Scalable

Data access is in local memory for most situations, which is extremely fast.

Server cluster is horizontally scalable, you can simplely add more servers to increase system capacity.

### Transaction / 'row' based locking

All data access inside a request (handler or rpc) is transaction guarded,
changes will be either commited or rolledback (on exception) after one request. There is no chance to left dirty 'half-modified' data.

Memorydb use a document (like mysql's row) based locking mechanism to control concurrency.

### High Availability

All server (which perserve memorydb's data) is backed by one or more redis replication. Data can be restored after server failure (except uncommited data).

## Quick's Philosophy

A typical realtime game server framework is stateful (for performance), all states is keept in server local memory. However, this approach has significant drawbacks:

1. Any exceptions (may be caused by bugs or unexpected client input) may result in non-consistent state (dirty data, half-modified data), which is very difficult to recover.
2. HA is hard to support, in memory data will be lost on server failure.
3. Across server api (which call rpc inside api) is errorprone.
4. Use must first locate the data (which server is this data in?) and then access it.

Thanks to memorydb, quick pomelo un-invent the stateful approach and use a web server like 'MVC' based architecture. All servers become stateless and all states is stored in memorydb. You can now get all benifits from a typical stateless web server, without losing performance and scalibility of in memory stateful server (As long as you access same data from the same server). [read more about memorydb](https://github.com/rain1017/memorydb).

## Quick Sample

```
TBD
```

## Guide

