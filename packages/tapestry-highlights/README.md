# tapestry-highlights

## Running tests

```sh
# Run all tests
npm run test
# Run specific tests
npm run test -- e2e/HighlightManager.spec.ts -g "should create a highlight" --project=chromium
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

## Updating snapshots

Requires docker so that the snapshots are from Linux and match our Github CI:

```sh
npm run test-update-snapshots
```

The CI Github action uploads the Playwright report (you must navigate to the workflow run from
Actions, not from the PR) where you can see failure explanations e.g. screenshot diffs.
