import { roundtrip } from "./setup";

describe("Native Classes", () => {
  describe("Date", () => {
    it("serializes Date", () => {
      const value = new Date("2024-01-01T12:30:45.000Z");

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(value.getTime());
    });

    it("preserves Date references", () => {
      const date = new Date();

      const value = {
        first: date,
        second: date,
      };

      const result = roundtrip(value);

      expect(result.first).toBe(result.second);
      expect(result.first).toBeInstanceOf(Date);
    });
  });

  describe("RegExp", () => {
    it("serializes RegExp", () => {
      const value = /hello\\d+/gi;

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(RegExp);
      expect(result.source).toBe(value.source);
      expect(result.flags).toBe(value.flags);
    });

    it("preserves RegExp references", () => {
      const regex = /test/gi;

      const value = {
        first: regex,
        second: regex,
      };

      const result = roundtrip(value);

      expect(result.first).toBe(result.second);
    });
  });

  describe("Set", () => {
    it("serializes an empty Set", () => {
      const value = new Set();

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it("serializes a Set", () => {
      const value = new Set([1, 2, 3, "hello"]);

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(value);
    });

    it("serializes a Set containing objects", () => {
      const object = { value: 42 };
      const value = new Set([object]);

      const result = roundtrip(value);

      const [item] = result;

      expect(item).toEqual(object);
    });

    it("preserves shared references", () => {
      const shared = { value: 42 };

      const value = {
        object: shared,
        set: new Set([shared]),
      };

      const result = roundtrip(value);

      expect(result.set.has(result.object)).toBe(true);
    });
  });

  describe("Map", () => {
    it("serializes an empty Map", () => {
      const value = new Map();

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it("serializes a Map", () => {
      const value = new Map<string, string | number>([
        ["name", "Alice"],
        ["age", 30],
      ]);

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(value);
    });

    it("serializes a Map with object keys", () => {
      const key = { id: 1 };
      const value = new Map([[key, "value"]]);

      const result = roundtrip(value);

      const [[resultKey, resultValue]] = result;

      expect(resultKey).toEqual(key);
      expect(resultValue).toBe("value");
    });

    it("preserves shared references", () => {
      const shared = { value: 42 };

      const value = {
        object: shared,
        map: new Map([["value", shared]]),
      };

      const result = roundtrip(value);

      expect(result.map.get("value")).toBe(result.object);
    });
  });

  describe("boxed primitives", () => {
    it("serializes String objects", () => {
      const value = new String("hello");

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(String);
      expect(result.valueOf()).toBe("hello");
    });

    it("serializes Number objects", () => {
      const value = new Number(42);

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Number);
      expect(result.valueOf()).toBe(42);
    });

    it("serializes Boolean objects", () => {
      const value = new Boolean(true);

      const result = roundtrip(value);

      expect(result).toBeInstanceOf(Boolean);
      expect(result.valueOf()).toBe(true);
    });
  });
});
