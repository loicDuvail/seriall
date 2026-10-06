import { roundtrip } from "./setup";

describe("arrays", () => {
  it("serializes an empty array", () => {
    const value: unknown[] = [];

    const result = roundtrip(value);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("serializes an array of primitives", () => {
    const value = [1, "hello", true, false, null, undefined];

    const result = roundtrip(value);

    expect(result).toEqual(value);
  });

  it("serializes nested arrays", () => {
    const value = [[1, 2, 3], ["a", "b"], [[true, false]]];

    const result = roundtrip(value);

    expect(result).toEqual(value);
  });

  it("serializes arrays containing objects", () => {
    const value = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const result = roundtrip(value);

    expect(result).toEqual(value);
  });

  it("preserves shared references", () => {
    const shared = { value: 42 };
    const value = [shared, shared];

    const result = roundtrip(value);

    expect(result[0]).toBe(result[1]);
  });

  it("preserves circular references", () => {
    const value: { self?: unknown } = {};
    value.self = value;

    const result = roundtrip(value);

    expect(result.self).toBe(result);
  });
});
