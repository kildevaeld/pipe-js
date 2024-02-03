import { isAsyncIterable, isIterable } from "./util";

export type Result<T> = T | Promise<T>;

export type PipeStream<T> = AsyncIterable<T> | Iterable<T>;

export async function* enumerate<T>(
  stream: PipeStream<T>
): AsyncGenerator<[item: T, idx: number]> {
  let idx = 0;
  for await (const next of stream) {
    yield [next, idx++];
  }
}

export async function* map<T, R>(
  stream: PipeStream<T>,
  func: (item: T, idx: number) => Result<R>
) {
  for await (const next of enumerate(stream)) {
    yield await func(...next);
  }
}

export async function* filter<T>(
  stream: PipeStream<T>,
  func: (item: T, idx: number) => Result<boolean>
): AsyncGenerator<T> {
  for await (const next of enumerate(stream)) {
    if (await func(...next)) {
      yield next[0];
    }
  }
}

export async function* take<T>(stream: PipeStream<T>, count: number) {
  for await (const [next, idx] of enumerate(stream)) {
    if (idx == count) {
      break;
    }

    yield next;
  }
}

export async function* skip<T>(stream: PipeStream<T>, count: number) {
  for await (const [next, idx] of enumerate(stream)) {
    if (idx < count) {
      continue;
    }

    yield next;
  }
}

export function peek<T>(
  stream: PipeStream<T>,
  peekFn: (item: T, idx: number) => unknown
) {
  return map(stream, async (item, idx) => {
    await peekFn(item, idx);
    return item;
  });
}

export type Flatten<T> = T extends AsyncIterable<infer InnerArr>
  ? InnerArr
  : T extends Iterable<infer InnerArr>
  ? InnerArr
  : T;

export async function* flatten<T>(
  stream: PipeStream<AsyncIterable<T> | Iterable<T> | T>
): AsyncGenerator<T, void, unknown> {
  for await (const item of stream) {
    if (isAsyncIterable<unknown, T>(item)) {
      for await (const inner of item) {
        yield inner;
      }
    } else if (isIterable(item)) {
      for await (const inner of item) {
        yield inner;
      }
    } else {
      yield item;
    }
  }
}

// Collectors

export async function forEach<T>(
  stream: PipeStream<T>,
  func: (item: T, idx: number) => Result<void>
): Promise<void> {
  for await (const next of enumerate(stream)) {
    await func(...next);
  }
}

export async function collect<T>(
  stream: PipeStream<T>,
  count?: number
): Promise<T[]> {
  const out = [];

  const s = typeof count === "number" ? take(stream, count) : stream;

  for await (const item of s) {
    out.push(item);
  }

  return out;
}

export async function fold<T, R>(
  stream: PipeStream<T>,
  acc: (prev: R, cur: T, idx: number) => Result<R>,
  init: R
): Promise<R> {
  await forEach(stream, async (next, idx) => {
    init = await acc(init, next, idx);
  });
  return init;
}

export async function find<T>(
  stream: PipeStream<T>,
  find: (item: T, idx: number) => Result<boolean>
) {
  for await (const item of enumerate(stream)) {
    if (await find(...item)) {
      return item;
    }
  }
}

export async function join<T>(
  stream: PipeStream<T>,
  joiner: string
): Promise<string> {
  return fold(
    stream,
    (prev, cur, idx) => {
      if (idx > 0) prev += joiner;
      return prev + String(cur);
    },
    ""
  );
}

// Utilities

export async function next<T>(
  stream: AsyncIterator<T> | Iterator<T>
): Promise<T> {
  return (await stream.next())?.value;
}

type IterItem<T> = T | PromiseLike<T>;

export async function* fromIterable<T>(
  iterable: Iterable<IterItem<T>>
): AsyncGenerator<Awaited<T>, void, unknown> {
  for (const next of iterable) {
    yield await Promise.resolve(next);
  }
}

export async function* fromPromise<T>(
  promise: PromiseLike<T>
): AsyncGenerator<Awaited<T>, void, unknown> {
  yield await promise;
}

export type Combine<T> = (Iterable<T> | AsyncIterable<T>)[];

export async function* combine<T>(combine: Combine<T> | Promise<Combine<T>>) {
  const input = await Promise.resolve(combine);

  const asyncIterators = Array.from(input, (o) => {
    if (isAsyncIterable(o)) {
      return o[Symbol.asyncIterator]();
    } else {
      return o[Symbol.iterator]();
    }
  });

  const results = [];

  let count = asyncIterators.length;
  const never = new Promise<any>(() => {});
  async function getNext(
    asyncIterator: AsyncIterator<T> | Iterator<T>,
    index: number
  ) {
    const result = await asyncIterator.next();
    return {
      index,
      result,
    };
  }

  const nextPromises = asyncIterators.map(getNext);
  try {
    while (count) {
      const { index, result } = await Promise.race(nextPromises);
      if (result.done) {
        nextPromises[index] = never;
        results[index] = result.value;
        count--;
      } else {
        nextPromises[index] = getNext(asyncIterators[index], index);
        yield result.value;
      }
    }
  } finally {
    for (const [index, iterator] of asyncIterators.entries())
      if (nextPromises[index] != never && iterator.return != null)
        iterator.return();
    // no await here - see https://github.com/tc39/proposal-async-iteration/issues/126
  }
}

export async function* chain<T>(
  stream1: AsyncIterable<T>,
  stream2: AsyncIterable<T>
) {
  for await (const next of stream1) {
    yield next;
  }

  for await (const next of stream2) {
    yield next;
  }
}
