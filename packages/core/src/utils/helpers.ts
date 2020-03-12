import pLimit from 'p-limit';

/**
 * Converts a string to 32bit integer
 */
export function stringToHash(str: string): number {
  let hash = 0;

  // tslint:disable-next-line: triple-equals
  if (str.length == 0) {
    return hash;
  }

  let char;
  for (let i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    // tslint:disable-next-line: no-bitwise
    hash = (hash << 5) - hash + char;
    // tslint:disable-next-line: no-bitwise
    hash = hash & hash;
  }

  return hash;
}

type Next = () => void;
type Fn<T> = (input: T, next: Next) => void;

export function use<T>(...fns: Array<Fn<T>>) {
  return (input: T) => {
    function createNext(i: number) {
      if (i >= fns.length) {
        return () => {};
      }

      return function next() {
        fns[i](input, createNext(i + 1));
      };
    }

    fns[0](input, createNext(1));
  };
}

export function useLimit(concurrency: number) {
  return pLimit(concurrency);
}
