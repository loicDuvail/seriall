import { roundtrip } from "./setup";

describe("primitive values", () => {
  it.each([
    ["string", "hello"],
    ["empty string", ""],
    ["number", 42],
    ["negative number", -42],
    ["zero", 0],
    ["boolean true", true],
    ["boolean false", false],
  ])("serializes and deserializes %s", (_, value) => {
    const result = roundtrip(value);

    expect(result).toBe(value);
  });

  it("serializes null", () => {
    const result = roundtrip(null);

    expect(result).toBeNull();
  });

  it("serializes undefined", () => {
    const result = roundtrip(undefined);

    expect(result).toBeUndefined();
  });
});
