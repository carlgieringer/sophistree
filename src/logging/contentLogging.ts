/* Use this in shared contexts where we don't have exclusive access to globals, i.e. in content scripts. */

// Something seems to be wrong with Sentry's types...
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Based on instructions from
// https://docs.sentry.io/platforms/javascript/best-practices/shared-environments/

import {
  BrowserClient,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
  Scope,
  SeverityLevel,
} from "@sentry/browser";

// filter integrations that use the global variable
const integrations = getDefaultIntegrations({}).filter(
  (defaultIntegration) =>
    !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(
      defaultIntegration.name,
    ),
);

const client = new BrowserClient({
  dsn: "https://e3e3c422a56e870cdc1bfae52535fbd4@o4508077991002112.ingest.us.sentry.io/4508078000111616",
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  integrations: integrations,
});

const scope = new Scope();
scope.setClient(client);

client.init(); // initializing has to be done after setting the client on the scope

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
  level: SeverityLevel = "log",
  error?: unknown,
) {
  switch (level) {
    case "error":
      console.error(message);
      break;
    case "warning":
      console.warn(message);
      break;
    case "log":
    default:
      console.log(message);
      break;
    case "info":
      console.info(message);
      break;
    case "debug":
      console.debug(message);
      break;
  }
  scope.captureMessage(message, level);
  if (error) {
    scope.captureException(error);
  }
}
