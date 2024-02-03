import { expect } from "expect";
import { fromIterable } from "../functions";
import { Pipe } from "../pipe";

describe("Pipe", () => {
  it("should be a async iterator", async () => {
    const pipe = new Pipe(fromIterable([1]));

    expect(await pipe.first()).toEqual(1);
  });

  it("should flatten", async () => {
    const pipe = new Pipe(fromIterable([1, fromIterable([2]), [3]]));

    expect(await pipe.flat().collect()).toEqual([1, 2, 3]);
  });
});
