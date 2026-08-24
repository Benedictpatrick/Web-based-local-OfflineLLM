/** Chains calls onto a shared queue so concurrent callers run one at a time,
 *  each seeing the effects of the one before it, instead of racing off the
 *  same stale snapshot. A failed call doesn't block the queue for later ones. */
export function serialize<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  let queue: Promise<unknown> = Promise.resolve();
  return (...args: Args): Promise<T> => {
    const run = queue.then(() => fn(...args));
    queue = run.catch(() => {});
    return run;
  };
}
