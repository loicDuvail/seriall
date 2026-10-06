import { roundtrip } from "./setup";

describe("complex graphs", () => {
  it("serializes a complex object graph", () => {
    const user = {
      name: "Alice",
    };

    const shared = {
      value: 42,
    };

    const date = new Date("2024-01-01T00:00:00.000Z");

    const value = {
      user,
      shared,
      date,
      aliases: [user, user],
      references: {
        first: shared,
        second: shared,
      },
      values: {
        null: null,
        undefined: undefined,
        bigint: 123n,
        nan: NaN,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        negativeZero: -0,
        symbol: Symbol("test"),
      },
      self: {},
    };

    value.self = value;

    const result = roundtrip(value);

    expect(result.user.name).toBe("Alice");

    expect(result.shared.value).toBe(42);

    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.getTime()).toBe(date.getTime());

    expect(result.aliases[0]).toBe(result.user);
    expect(result.aliases[1]).toBe(result.user);

    expect(result.references.first).toBe(result.shared);
    expect(result.references.second).toBe(result.shared);

    expect(result.values.null).toBeNull();
    expect(result.values.undefined).toBeUndefined();
    expect(result.values.bigint).toBe(123n);
    expect(Number.isNaN(result.values.nan)).toBe(true);
    expect(result.values.infinity).toBe(Infinity);
    expect(result.values.negativeInfinity).toBe(-Infinity);
    expect(Object.is(result.values.negativeZero, -0)).toBe(true);
    expect(result.values.symbol.description).toBe("test");
    expect(result.self).toBe(result);
  });
});
