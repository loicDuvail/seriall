import { roundtrip } from "./setup";

describe("numbers", () => {
  describe("special numbers", () => {
    it.each([
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
      ["-0", -0],
    ])("preserves %s", (_, value) => {
      const result = roundtrip(value);

      expect(Object.is(result, value)).toBe(true);
    });

    it("preserves special numbers inside objects", () => {
      const value = {
        nan: NaN,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        negativeZero: -0,
      };

      const result = roundtrip(value);

      expect(Number.isNaN(result.nan)).toBe(true);
      expect(result.infinity).toBe(Infinity);
      expect(result.negativeInfinity).toBe(-Infinity);
      expect(Object.is(result.negativeZero, -0)).toBe(true);
    });

    it("preserves special numbers inside arrays", () => {
      const value = [NaN, Infinity, -Infinity, -0];

      const result = roundtrip(value);

      expect(Number.isNaN(result[0])).toBe(true);
      expect(result[1]).toBe(Infinity);
      expect(result[2]).toBe(-Infinity);
      expect(Object.is(result[3], -0)).toBe(true);
    });
  });

  describe("bigint", () => {
    it("serializes bigint", () => {
      const value = 123456789012345678901234567890n;

      const result = roundtrip(value);

      expect(result).toBe(value);
      expect(typeof result).toBe("bigint");
    });

    it("preserves negative bigint", () => {
      const value = -123456789012345678901234567890n;

      const result = roundtrip(value);

      expect(result).toBe(value);
    });

    it("preserves bigint in nested structures", () => {
      const value = {
        amount: 123n,
        values: [456n, 789n],
      };

      const result = roundtrip(value);

      expect(result.amount).toBe(123n);
      expect(result.values).toEqual([456n, 789n]);
    });
  });
});
