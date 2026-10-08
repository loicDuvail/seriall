import { LIB, PROTOCOL_VERSION } from "@const";
import { serializer } from "./setup";
import { Serializer } from "@";

describe("malicious / malformed payloads", () => {
  const payload = (graph: unknown[], extra = {}) =>
    JSON.stringify({
      lib: LIB,
      v: PROTOCOL_VERSION,
      d: graph,
      ...extra,
    });

  describe("graph references", () => {
    it.each([
      ["negative", -1],
      ["out of range", 999],
      ["non-integer", 0.5],
      ["string", "0"],
      ["null", null],
      ["boolean", true],
    ])("rejects %s graph references", (_, reference) => {
      const serialized = payload([[0, reference]]);

      expect(() => serializer.deserialize(serialized)).toThrow(
        "Invalid serialized graph reference",
      );
    });
  });

  describe("metadata", () => {
    it("rejects invalid JSON", () => {
      expect(() =>
        serializer.deserialize('{"lib":"seriall","v":1,"d":'),
      ).toThrow("Data is malformed JSON");
    });

    it("rejects an invalid library", () => {
      const serialized = JSON.stringify({
        lib: "evil",
        v: PROTOCOL_VERSION,
        d: [],
      });

      expect(() => serializer.deserialize(serialized)).toThrow(
        'Expected "seriall", got "evil"',
      );
    });

    it("rejects an invalid protocol version", () => {
      const serialized = JSON.stringify({
        lib: LIB,
        v: 999,
        d: [],
      });

      expect(() => serializer.deserialize(serialized)).toThrow(
        "Expected 1, got 999",
      );
    });

    it("rejects a non-array graph", () => {
      const serialized = JSON.stringify({
        lib: LIB,
        v: PROTOCOL_VERSION,
        d: {},
      });

      expect(() => serializer.deserialize(serialized)).toThrow(
        "'d' must be an array",
      );
    });
  });

  describe("transformers", () => {
    it("rejects an unknown transformer", () => {
      const serialized = payload([["evil-transformer"]]);

      expect(() => serializer.deserialize(serialized)).toThrow(
        'No transformer found with id "evil-transformer"',
      );
    });

    it("rejects a malformed transformer node", () => {
      const serialized = payload([["Dte", 999]]);

      expect(() => serializer.deserialize(serialized)).toThrow(
        "Invalid serialized graph reference",
      );
    });
  });

  describe("prototype pollution", () => {
    it("does not pollute Object.prototype through __proto__", () => {
      const serialized = payload([
        {
          __proto__: 1,
        },
        "polluted",
      ]);

      expect(() => serializer.deserialize(serialized)).not.toThrow();

      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("does not pollute Object.prototype through constructor.prototype", () => {
      const serialized = payload([
        {
          constructor: 1,
        },
        "polluted",
      ]);

      const result = serializer.deserialize(serialized);

      expect(({} as Record<string, unknown>).polluted).toBeUndefined();

      expect(result).toBeDefined();
    });
  });

  describe("limits", () => {
    it("rejects payloads exceeding max payload size", () => {
      const limitedSerializer = new Serializer({
        limits: {
          maxPayloadSize: 20,
        },
      });

      const serialized = JSON.stringify({
        lib: LIB,
        v: PROTOCOL_VERSION,
        d: ["this payload is too large"],
      });

      expect(() => limitedSerializer.deserialize(serialized)).toThrow(
        "Payload is too big",
      );
    });

    it("rejects graphs exceeding max nodes", () => {
      const limitedSerializer = new Serializer({
        limits: {
          maxNodes: 2,
        },
      });

      const serialized = payload([0, 1, 2]);

      expect(() => limitedSerializer.deserialize(serialized)).toThrow(
        "Too many nodes",
      );
    });

    it("rejects excessive nesting", () => {
      const limitedSerializer = new Serializer({
        limits: {
          maxDepth: 2,
        },
      });

      const serialized = payload([[1], [2], 42]);

      expect(() => limitedSerializer.deserialize(serialized)).toThrow(
        "Max depth exceeded",
      );
    });
  });

  describe("hostile graph shapes", () => {
    it("handles a self-referencing array", () => {
      const serialized = payload([[0]]);

      const result = serializer.deserialize(serialized);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toBe(result);
    });

    it("handles a self-referencing object", () => {
      const serialized = payload([
        {
          self: 0,
        },
      ]);

      const result = serializer.deserialize(serialized);

      expect(result.self).toBe(result);
    });

    it("handles a large number of references to one node", () => {
      const references = Array.from({ length: 1000 }, () => 1);

      const serialized = payload([references, { value: 2 }, 42]);

      const result = serializer.deserialize(serialized);

      expect(result.every((value: any) => value === result[0])).toBe(true);
      expect(result[0].value).toBe(42);
    });
  });
});
