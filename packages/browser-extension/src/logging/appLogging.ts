/** Do not import this file in shared contexts such as the content script. Use it for background
 * script and side panel app. */

// Sentry's types don't seem to work...
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://e3e3c422a56e870cdc1bfae52535fbd4@o4508077991002112.ingest.us.sentry.io/4508078000111616",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

export function debug(message: string, error?: unknown) {
  log(message, "debug", error);
}

export function info(message: string, error?: unknown) {
  log(message, "info", error);
}

export function warn(message: string, error?: unknown) {
  log(message, "warning", error);
}

export function error(message: string, error?: unknown) {
  log(message, "error", error);
}

export function log(
  message: string,
  level: Sentry.SeverityLevel = "log",
  error?: unknown,
) {
  const logArgs: unknown[] = [message];
  if (error) {
    logArgs.push(error);
  }
  switch (level) {
    case "error":
      console.error(...logArgs);
      break;
    case "warning":
      console.warn(...logArgs);
      break;
    case "log":
    default:
      console.log(...logArgs);
      break;
    case "info":
      console.info(...logArgs);
      break;
    case "debug":
      console.debug(...logArgs);
      break;
  }
  Sentry.captureMessage(message, level);
  if (error) {
    Sentry.captureException(error);
  }
}
