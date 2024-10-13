# tapestry-highlights-byo-anchor

```sh
npm run test
```

npx playwright test --ui
Starts the interactive UI mode.

npx playwright test --project=chromium
Runs the tests only on Desktop Chrome.

npx playwright test example
Runs the tests in a specific file.

npx playwright test --debug
Runs the tests in debug mode.

Add a `debugger` statement to the `evaluate` code and open chrome devtools in window at beginning of
test to debug.

npx playwright codegen
Auto generate tests with Codegen.
