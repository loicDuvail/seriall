import { LIB, PROTOCOL_VERSION } from "../const";
import { serializer } from "./setup";

describe("Protocol", () => {
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
