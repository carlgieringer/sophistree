# Sync service

This package contains a server that syncs automerge docs.

## Getting started

Copy the env file:

```shell
cp .env.example .env
# update the DB password
```

Run the server with hotreload for changes:

```shell
yarn run dev
```

The server also runs with hot reload as part of the root package's `watch-all` script.

## Database schema

Prisma's migrations don't tolerate tables that aren't in the Prisma schema,
so we put the sync service's table in a schema `sync_service`.

## Reading sync service data

```psql
sophistree=# SELECT
  encode(key[1], 'escape') as key_1,
  encode(key[2], 'escape') as key_2,
  encode(key[3], 'escape') as key_3
FROM sync_service.argument_maps_automerge_storage;
```
