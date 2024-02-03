import {
  collect,
  filter,
  fold,
  forEach,
  join,
  map,
  find,
  take,
  peek,
  chain,
  Combine,
  combine,
  flatten,
  Flatten,
  fromPromise,
  skip,
  Result,
} from "./functions";
import { isAsyncIterable, isIterable, isPromise } from "./util";

async function* noop<T>(): AsyncGenerator<T> {}

async function* noopErr<T>(): AsyncGenerator<T> {
  throw new Error("use after move");
}

export class Pipe<T> implements AsyncIterable<T> {
  #stream: AsyncIterable<T>;
  #errOnMoved: boolean;
  #moveOnChain: boolean;

  constructor(
    stream: AsyncIterableIterator<T>,
    errOnMove = false,
    moveOnChain = true
  ) {
    this.#stream = stream;
    this.#errOnMoved = errOnMove;
    this.#moveOnChain = moveOnChain;
  }

  set errOnMove(on: boolean) {
    this.#errOnMoved = on;
  }

  get errOnMove(): boolean {
    return this.#errOnMoved;
  }

  set moveOnChain(on: boolean) {
    this.#moveOnChain = on;
  }

  get moveOnChain(): boolean {
    return this.#moveOnChain;
  }

  filter(func: (item: T, idx: number) => Result<boolean>): Pipe<T> {
    return this.#chained(filter(this.#stream, func));
  }

  map<R>(func: (item: T, id: number) => Result<R>): Pipe<R> {
    return this.#chained(map(this.#stream, func));
  }

  take(count: number): Pipe<T> {
    return this.#chained(take(this.#stream, count));
  }

  skip(count: number): Pipe<T> {
    return this.#chained(skip(this.#stream, count));
  }

  peek(peekFn: (item: T) => unknown): Pipe<T> {
    return this.#chained(peek(this.#stream, peekFn));
  }

  chain(nextStream: AsyncIterable<T>): Pipe<T> {
    return this.#chained(chain(this.#stream, nextStream));
  }

  combine(streams: Combine<T>): Pipe<T> {
    return this.#chained(combine([this.#stream, ...streams]));
  }

  flat(): Pipe<Flatten<T>> {
    return this.#chained(flatten(this.#stream)) as Pipe<Flatten<T>>;
  }

  async first(): Promise<T | undefined> {
    const stream = this.take(1)[Symbol.asyncIterator]();
    return (await stream.next()).value;
  }

  // Collect
  async forEach(func: (item: T, idx: number) => Result<void>): Promise<void> {
    return forEach(this.#move(), func);
  }

  async collect(count?: number): Promise<T[]> {
    return collect(this.#move(), count);
  }

  async fold<R>(acc: (prev: R, cur: T) => Result<R>, init: R): Promise<R> {
    return await fold(this.#move(), acc, init);
  }

  async find(func: (item: T) => Result<boolean>) {
    return await find(this.#move(), func);
  }

  async join(joiner: string): Promise<string> {
    return await join(this.#move(), joiner);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.#stream[Symbol.asyncIterator]();
  }

  #chained<R>(next: AsyncGenerator<R>): Pipe<R> {
    if (this.#moveOnChain) {
      this.#stream = this.#noopFn();
      return new Pipe(next, this.#errOnMoved, this.#moveOnChain);
    } else {
      this.#stream = next as unknown as AsyncIterable<T>;
      return this as unknown as Pipe<R>;
    }
  }

  #move() {
    const stream = this.#stream;
    if (this.#moveOnChain) {
      this.#stream = this.#noopFn();
    }
    return stream;
  }

  #noopFn() {
    return this.#errOnMoved ? noopErr<T>() : noop<T>();
  }
}

export type PipeInput<T> =
  | AsyncIterable<T>
  | Iterable<T>
  | Promise<AsyncIterable<T> | Iterable<T>>
  | T;

export function pipe<T>(...input: PipeInput<T>[]): Pipe<T> {
  const o = input.map((m) => {
    if (isPromise(m)) {
      return flatten(fromPromise(m));
    } else if (isIterable(m) || isAsyncIterable(m)) {
      return m;
    } else {
      return [m];
    }
  });

  return new Pipe(combine(o));
}
