import { serializer } from "./setup";

describe("plain objects", () => {
  it("serializes an empty object", () => {
    const value = {};

    const result = serializer.deserialize(serializer.serialize(value));

    expect(result).toEqual({});
  });

  it("serializes object properties", () => {
    const value = {
      name: "Alice",
      age: 30,
      active: true,
      nullable: null,
      missing: undefined,
    };

    const result = serializer.deserialize(
      serializer.serialize(value),
    ) as typeof value;

    expect(result).toEqual(value);
  });

  it("serializes nested objects", () => {
    const value = {
      user: {
        name: "Alice",
        address: {
          city: "Paris",
          country: "France",
        },
      },
    };

    const result = serializer.deserialize(serializer.serialize(value));

    expect(result).toEqual(value);
  });

  it("preserves shared references", () => {
    const shared = {
      value: 42,
    };

    const value = {
      first: shared,
      second: shared,
    };

    const result = serializer.deserialize(
      serializer.serialize(value),
    ) as typeof value;

    expect(result.first).toBe(result.second);
  });

  it("preserves nested circular references", () => {
    const value: {
      child: {
        parent?: unknown;
      };
    } = {
      child: {},
    };

    value.child.parent = value;

    const result = serializer.deserialize(
      serializer.serialize(value),
    ) as typeof value;

    expect(result.child.parent).toBe(result);
  });
});
