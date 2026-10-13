// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 15_000;

export async function timeout(
  ms = MAX_WAIT_PER_ROUND,
  errorMsg: string = "timeout",
): Promise<never> {
  return await new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
  });
}

export function shortenId(id: string): string {
  return id.slice(0, 4);
}

/**
 * Makes a promise abortable using an optional AbortSignal.
 * If the signal is already aborted, the returned promise rejects immediately with the signal's reason.
 * Otherwise, it races the original promise against the abort signal.
 * @param promise The original promise to make abortable.
 * @param signal An optional AbortSignal to control the abortion.
 * @returns A promise that resolves or rejects with the original promise's outcome, or rejects with the signal's reason if aborted.
 */
export async function abortable<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  // If no abort signal is provided, just await the original promise.
  if (signal === undefined) return await promise;

  // Reject if the signal is already aborted
  signal.throwIfAborted();

  // Create a new promise that races the original promise against the abort signal
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const reason: unknown = signal.reason;
      reject(reason instanceof Error ? reason : new Error(String(reason))); // Make sure it's an error
    };

    // Add an event listener to handle the abort signal
    signal.addEventListener("abort", onAbort, { once: true });

    // Return the abortable promise and remove listener once finished
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}
