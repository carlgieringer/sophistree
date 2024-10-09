import * as appLogger from "../logging/appLogging";

type WrapperReturn<R> = R extends Promise<unknown> ? undefined : R | undefined;

/**
 * Wrap top-level callbacks to prevent uncaught exceptions.
 *
 * Returns a new function, so the wrapped function reference cannot be
 * removed from handlers. Use catchErrors inside a callback if you
 * need to remove the function.
 */
export function wrapCallback<Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
): (...args: Args) => WrapperReturn<Return> {
  return function (...args: Args): WrapperReturn<Return> {
    try {
      const result = callback(...args);
      if (result instanceof Promise) {
        // Although Promise return values are often not supported in callbacks (e.g. in Chrome
        // extension callbacks), accept them as a convenience and catch any uncaught errors.
        result.catch((error) => {
          appLogger.error("Callback failed unexpectedly", error);
        });
        return undefined as WrapperReturn<Return>;
      }
      return result as WrapperReturn<Return>;
    } catch (error) {
      appLogger.error("Callback failed unexpectedly", error);
    }
    return undefined as WrapperReturn<Return>;
  };
}

/** Immediately calls callback, catching and logging errors. */
export function catchErrors<Return>(callback: () => Return) {
  try {
    return callback();
  } catch (error) {
    appLogger.error("Callback failed unexpectedly", error);
  }
}
