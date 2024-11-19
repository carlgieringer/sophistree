# Guidelines

General guidelines for AI prompts.

- Order top-level identifiers primary/main functions first, followed by their supporting functions.
  For example, in a file named `userAuthentication.ts`, place the main exported function
  `authenticateUser` at the top, followed by helper functions like `validateCredentials` or
  `hashPassword`. Exception: top level identifiers may be ordered as necessary for runtime
  constraints. I.e. values can come first if they must be defined before another value.
- Use undefined instead of null.
- Use react-native-paper components for UI.
