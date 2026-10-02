// AI generated tests

import { describe, expect, it } from "@jest/globals";
import { Serializer, SerializableClass } from "..";
import { LIB, PROTOCOL_VERSION } from "../const";

const serializer = new Serializer();

describe("serializer", () => {
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
      const serialized = serializer.serialize(value);
      const result = serializer.deserialize(serialized);

      expect(result).toBe(value);
    });

    it("serializes null", () => {
      const result = serializer.deserialize(serializer.serialize(null));

      expect(result).toBeNull();
    });

    it("serializes undefined", () => {
      const result = serializer.deserialize(serializer.serialize(undefined));

      expect(result).toBeUndefined();
    });
  });

  describe("special numbers", () => {
    it.each([
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
      ["-0", -0],
    ])("preserves %s", (_, value) => {
      const result = serializer.deserialize(serializer.serialize(value));

      expect(Object.is(result, value)).toBe(true);
    });

    it("preserves special numbers inside objects", () => {
      const value = {
        nan: NaN,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        negativeZero: -0,
      };

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(Number.isNaN(result.nan)).toBe(true);
      expect(result.infinity).toBe(Infinity);
      expect(result.negativeInfinity).toBe(-Infinity);
      expect(Object.is(result.negativeZero, -0)).toBe(true);
    });

    it("preserves special numbers inside arrays", () => {
      const value = [NaN, Infinity, -Infinity, -0];

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(Number.isNaN(result[0])).toBe(true);
      expect(result[1]).toBe(Infinity);
      expect(result[2]).toBe(-Infinity);
      expect(Object.is(result[3], -0)).toBe(true);
    });
  });

  describe("bigint", () => {
    it("serializes bigint", () => {
      const value = 123456789012345678901234567890n;

      const result = serializer.deserialize(serializer.serialize(value));

      expect(result).toBe(value);
      expect(typeof result).toBe("bigint");
    });

    it("preserves negative bigint", () => {
      const value = -123456789012345678901234567890n;

      const result = serializer.deserialize(serializer.serialize(value));

      expect(result).toBe(value);
    });

    it("preserves bigint in nested structures", () => {
      const value = {
        amount: 123n,
        values: [456n, 789n],
      };

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result.amount).toBe(123n);
      expect(result.values).toEqual([456n, 789n]);
    });
  });

  describe("symbols", () => {
    it("serializes a symbol", () => {
      const value = Symbol("test");

      const result = serializer.deserialize(serializer.serialize(value));

      expect(typeof result).toBe("symbol");
      expect((result as symbol).description).toBe("test");
    });

    it("preserves a symbol without a description", () => {
      const value = Symbol();

      const result = serializer.deserialize(serializer.serialize(value));

      expect(typeof result).toBe("symbol");
      expect((result as symbol).description).toBeUndefined();
    });

    it("serializes symbols in objects", () => {
      const value = {
        symbol: Symbol("test"),
      };

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(typeof result.symbol).toBe("symbol");
      expect(result.symbol.description).toBe("test");
    });
  });

  describe("arrays", () => {
    it("serializes an empty array", () => {
      const value: unknown[] = [];

      const result = serializer.deserialize(serializer.serialize(value));

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("serializes an array of primitives", () => {
      const value = [1, "hello", true, false, null, undefined];

      const result = serializer.deserialize(serializer.serialize(value));

      expect(result).toEqual(value);
    });

    it("serializes nested arrays", () => {
      const value = [[1, 2, 3], ["a", "b"], [[true, false]]];

      const result = serializer.deserialize(serializer.serialize(value));

      expect(result).toEqual(value);
    });

    it("serializes arrays containing objects", () => {
      const value = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      const result = serializer.deserialize(serializer.serialize(value));

      expect(result).toEqual(value);
    });

    it("preserves shared references", () => {
      const shared = { value: 42 };
      const value = [shared, shared];

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result[0]).toBe(result[1]);
    });

    it("preserves circular references", () => {
      const value: { self?: unknown } = {};
      value.self = value;

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result.self).toBe(result);
    });
  });

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

  describe("Date", () => {
    it("serializes Date", () => {
      const value = new Date("2024-01-01T12:30:45.000Z");

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as Date;

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(value.getTime());
    });

    it("preserves Date references", () => {
      const date = new Date();

      const value = {
        first: date,
        second: date,
      };

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result.first).toBe(result.second);
      expect(result.first).toBeInstanceOf(Date);
    });
  });

  describe("RegExp", () => {
    it("serializes RegExp", () => {
      const value = /hello\\d+/gi;

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as RegExp;

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

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result.first).toBe(result.second);
    });
  });

  describe("Set", () => {
    it("serializes an empty Set", () => {
      const value = new Set();

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as Set<unknown>;

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it("serializes a Set", () => {
      const value = new Set([1, 2, 3, "hello"]);

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as Set<unknown>;

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(value);
    });

    it("serializes a Set containing objects", () => {
      const object = { value: 42 };
      const value = new Set([object]);

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as Set<{ value: number }>;

      const [item] = result;

      expect(item).toEqual(object);
    });

    it("preserves shared references", () => {
      const shared = { value: 42 };

      const value = {
        object: shared,
        set: new Set([shared]),
      };

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result.set.has(result.object)).toBe(true);
    });
  });

  describe("Map", () => {
    it("serializes an empty Map", () => {
      const value = new Map();

      const result = serializer.deserialize(serializer.serialize(value)) as Map<
        unknown,
        unknown
      >;

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it("serializes a Map", () => {
      const value = new Map<string, string | number>([
        ["name", "Alice"],
        ["age", 30],
      ]);

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(value);
    });

    it("serializes a Map with object keys", () => {
      const key = { id: 1 };
      const value = new Map([[key, "value"]]);

      const result = serializer.deserialize(serializer.serialize(value)) as Map<
        { id: number },
        string
      >;

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

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

      expect(result.map.get("value")).toBe(result.object);
    });
  });

  describe("boxed primitives", () => {
    it("serializes String objects", () => {
      const value = new String("hello");

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as String;

      expect(result).toBeInstanceOf(String);
      expect(result.valueOf()).toBe("hello");
    });

    it("serializes Number objects", () => {
      const value = new Number(42);

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as Number;

      expect(result).toBeInstanceOf(Number);
      expect(result.valueOf()).toBe(42);
    });

    it("serializes Boolean objects", () => {
      const value = new Boolean(true);

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as Boolean;

      expect(result).toBeInstanceOf(Boolean);
      expect(result.valueOf()).toBe(true);
    });
  });

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

      const result = serializer.deserialize(
        serializer.serialize(value),
      ) as typeof value;

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

  describe("serialized graph", () => {
    it("produces valid JSON", () => {
      const value = {
        hello: "world",
        nested: {
          value: 42,
        },
      };

      const serialized = serializer.serialize(value);

      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("stores shared objects only once", () => {
      const shared = {
        value: 42,
      };

      const value = {
        first: shared,
        second: shared,
      };

      const { d: graph } = JSON.parse(serializer.serialize(value));

      expect(graph[0].first).toBe(graph[0].second);
    });
  });

  describe("class registration", () => {
    it("registers and deregisters custom classes", () => {
      class TestEntity extends SerializableClass {}

      expect(() => {
        serializer.registerClass("TestEntity", TestEntity);
      }).not.toThrow();

      expect(() => {
        serializer.deregisterClass("TestEntity");
      }).not.toThrow();
    });

    it("serializes custom class instances", () => {
      class TestEntity extends SerializableClass {}

      serializer.registerClass("TestEntity", TestEntity);
      const testInstance = new TestEntity();

      expect(
        serializer.deserialize(serializer.serialize(testInstance)),
      ).toBeInstanceOf(TestEntity);

      serializer.deregisterClass("TestEntity");
    });

    it("serializes custom class instances with circular references", () => {
      class TestEntity extends SerializableClass {
        name: string;
        parent: TestEntity | undefined;
        children: TestEntity[] = [];
        self: TestEntity | undefined;

        constructor({ name }: { name: string }) {
          super();
          this.name = name;
        }
      }

      serializer.registerClass("TestEntity", TestEntity);

      const parent = new TestEntity({ name: "parent" });
      const child = new TestEntity({ name: "child" });

      // Parent -> child
      parent.children.push(child);
      child.parent = parent;

      // Direct self-reference
      parent.self = parent;

      // Child -> child
      child.self = child;

      const serialized = serializer.serialize(parent);
      const revived = serializer.deserialize(serialized);

      // Instances are restored
      expect(revived).toBeInstanceOf(TestEntity);
      expect(revived.children[0]).toBeInstanceOf(TestEntity);

      // Values are preserved
      expect(revived.name).toBe("parent");
      expect(revived.children[0].name).toBe("child");

      // Circular references are preserved
      expect(revived.self).toBe(revived);
      expect(revived.children[0].parent).toBe(revived);
      expect(revived.children[0].self).toBe(revived.children[0]);

      // The child isn't duplicated during deserialization
      expect(revived.children[0]).toBe(revived.children[0].parent.children[0]);

      serializer.deregisterClass("TestEntity");
    });
  });

  describe("invalid serialized graphs", () => {
    it("throws for an out-of-range reference", () => {
      const invalidGraph = JSON.stringify({
        lib: LIB,
        v: PROTOCOL_VERSION,
        d: [[999]],
      });

      expect(() => serializer.deserialize(invalidGraph)).toThrow(
        "Invalid serialized graph reference: 999",
      );
    });

    it("throws for a negative reference", () => {
      const invalidGraph = JSON.stringify({
        lib: LIB,
        v: PROTOCOL_VERSION,
        d: [[-1]],
      });

      expect(() => serializer.deserialize(invalidGraph)).toThrow(
        "Invalid serialized graph reference: -1",
      );
    });
  });
});
