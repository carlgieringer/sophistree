# Sophistree monorepo

Sophistree is a Chrome extension for mapping arguments.

![screenshot](https://github.com/carlgieringer/sophistree/blob/main/packages/browser-extension/docs/screenshot.png?raw=true)

This repository is a monorepo containing code for the Sophistree browser extension and the
`tapestry-highlights` npm package which Sophistree uses.

See the READMEs in the respective subdirectories under `packages` for details:

- [Sophistree extension README](https://github.com/carlgieringer/sophistree/blob/main/packages/browser-extension/README.md)
- [tapestry-highlights README](https://github.com/carlgieringer/sophistree/blob/main/packages/tapestry-highlights/README.md)

## Scripts

- `npm run check-all`: run all checks except for snapshot tests.
- `npm run test-snapshots --workspace=packages/tapestry-highlights`: run snapshot tests.

## Browser extension quick quick start

```sh
npm install
npm run watch-extension
```

Then load the extension unpacked from the
[packages/browser-extension/dist/dev/](packages/browser-extension/dist/dev/) folder.
