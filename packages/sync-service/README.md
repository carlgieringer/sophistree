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
