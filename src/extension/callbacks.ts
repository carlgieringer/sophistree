type WrapperReturn<R> = R extends Promise<unknown> ? undefined : R | undefined;

/**
 * Wrap top-level callbacks to prevent uncaught exceptions.
 *
 * Returns a new function, so the old function reference cannot be
 * removed from handlers. Use catchErrors inside a callback if you
 * want to remove the wrapped function.
 */
export function wrapCallback<Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
): (...args: Args) => WrapperReturn<Return> {
  return function (...args: Args): WrapperReturn<Return> {
    try {
      const result = callback(...args);
      if (result instanceof Promise) {
        result.catch((error) => {
          // This would be a good place to do error reporting.
          console.error(error);
        });
        return undefined as WrapperReturn<Return>;
      }
      return result as WrapperReturn<Return>;
    } catch (error) {
      // This would be a good place to do error reporting.
      console.error(error);
    }
    return undefined as WrapperReturn<Return>;
  };
}

/** Immediately calls callback, catching and logging errors. */
export function catchErrors<Return>(callback: () => Return) {
  try {
    return callback();
  } catch (error) {
    // This would be a good place to do error reporting.
    console.error(error);
  }
}

export const connectionErrorMessage =
  "Could not establish connection. Receiving end does not exist.";

export const accessChromeUrlErrorMessage = "Cannot access a chrome:// URL";
