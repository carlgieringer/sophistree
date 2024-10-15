# `tapestry-highlights`

`tapestry-highlights` is a browser highlighting library that supports overlapping highlights.

## Running tests

```sh
# Run all tests
npm run test
# Run specific tests
npm run test -- e2e/HighlightManager.spec.ts -g "should create a highlight"
# Run specific browsers
npm run test -- --project=chromium
```

## Debugging tests

```sh
npm run test-debug
```

To debug browser code (`page.evaluate`) code, you must add a `debugger` statement to the code, run
the following command, when the browser opens, open devtools (so that they will break upon reaching
the `debugger` statement), then start the tests from the Playwright window that also opened.

## Snapshots

By default `npm run test` ignores snapshots because developers local machines may produce different
screenshots. But in the CI check we run the snapshot tests against Linux. If you make changes that
affect the snapshot tests, you should update them (and confirm the changes look good.)

Running and updating the snapshot tests requires docker so that the snapshots are from Linux and
match our Github CI.

Test the snapshots:

```sh
npm run test-snapshots
```

If this fails, you can update them like:

```sh
npm run test-update-snapshots
```

Be sure to manually inspect them.

If your PR fails during the CI checks Github action, you can check the uploaded Playwright report
(you must navigate to the workflow run from Actions, not from the PR) where you can see failure
explanations e.g. screenshot diffs.

## Publishing

```sh
npm run package
```

### Test it works

Install the archive directly in the extension:

```sh
npm install tapestry-highlights-*.tgz --workspace=../browser-extension
```

Then try running the extension.

(Undo the install like:)

```sh
npm install . --workspace=../browser-extension
```
