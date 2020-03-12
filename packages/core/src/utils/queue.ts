import pLimit from 'p-limit';

export function useQueue<T>(options?: { concurrency?: number }) {
  const queue: Array<() => Promise<T>> = [];
  const limit = options?.concurrency ? pLimit(options.concurrency) : async (fn: () => Promise<T>) => fn();

  return {
    add(fn: () => Promise<T>) {
      queue.push(() => limit(fn));
    },
    runAll() {
      return Promise.all(queue.map(fn => fn()));
    },
  };
}
