import {
  map,
  fromIterable,
  next,
  filter,
  flatten,
  collect,
  take,
  skip,
} from "../functions";
import expect from "expect";

describe("Functions", function () {
  describe("#fromIterable()", function () {
    it("should create a stream from an array", async function () {
      const stream = fromIterable([1, 2, 3]);

      expect(await next(stream)).toBe(1);
      expect(await next(stream)).toBe(2);
      expect(await next(stream)).toBe(3);
      expect(await next(stream)).toBe(void 0);
    });

    it("should create a stream from an record type", async function () {
      const stream = fromIterable(
        Object.entries({
          test: "rapper",
        })
      );

      expect(await next(stream)).toStrictEqual(["test", "rapper"]);
      expect(await next(stream)).toBe(void 0);
    });
  });

  describe("#map()", function () {
    it("should create a stream from an array", async function () {
      const stream = map(fromIterable([1, 2, 3]), (item, idx) => item + idx);

      expect(await next(stream)).toBe(1);
      expect(await next(stream)).toBe(3);
      expect(await next(stream)).toBe(5);
      expect(await next(stream)).toBe(void 0);
    });
  });

  describe("#filter()", function () {
    it("should create a stream from an array", async function () {
      const stream = filter(fromIterable([1, 2, 3]), (item) => item % 2 == 0);

      expect(await next(stream)).toBe(2);
      expect(await next(stream)).toBe(void 0);
    });
  });

  describe("#flatten()", function () {
    it("should create a stream from an array", async function () {
      const stream = flatten(fromIterable([[1], [2, 3]]));

      expect(await next(stream)).toBe(1);
      expect(await next(stream)).toBe(2);
      expect(await next(stream)).toBe(3);
      expect(await next(stream)).toBe(void 0);
    });
  });

  it("##take", async function () {
    const stream = fromIterable([1, 2, 3, 4]);

    expect(await collect(take(stream, 3))).toStrictEqual([1, 2, 3]);
  });

  it("#skip()", async function () {
    const stream = fromIterable([1, 2, 3, 4]);
    expect(await collect(skip(stream, 3))).toStrictEqual([4]);
  });

  describe("#collect()", () => {
    it("should collect all", async function () {
      const stream = fromIterable([1, 2, 3]);
      expect(await collect(stream)).toStrictEqual([1, 2, 3]);
    });

    it("should collect max", async function () {
      const stream = fromIterable([1, 2, 3]);

      expect(await collect(stream, 2)).toStrictEqual([1, 2]);
    });
  });
});
