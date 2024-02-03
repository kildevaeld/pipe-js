export function isIterable<I, T = unknown>(i: I): i is I & Iterable<T> {
  return typeof (i as any)[Symbol.iterator] === "function";
}

export function isAsyncIterable<I, T = unknown>(
  i: I
): i is I & AsyncIterable<T> {
  return typeof (i as any)[Symbol.asyncIterator] === "function";
}

export function isPromise<T, S>(
  obj: PromiseLike<T> | S
): obj is PromiseLike<T> {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof (obj as any).then === "function"
  );
}
