import { Serializer } from "../serialization";
import { roundtrip, serializer } from "./setup";

describe("symbols", () => {
  it("serializes a symbol", () => {
    const value = Symbol("test");

    const result = roundtrip(value);

    expect(typeof result).toBe("symbol");
    expect((result as symbol).description).toBe("test");
  });

  it("preserves a symbol without a description", () => {
    const value = Symbol();

    const result = roundtrip(value);

    expect(typeof result).toBe("symbol");
    expect((result as symbol).description).toBeUndefined();
  });

  it("serializes symbols in objects", () => {
    const value = {
      symbol: Symbol("test"),
    };

    const result = roundtrip(value);

    expect(typeof result.symbol).toBe("symbol");
    expect(result.symbol.description).toBe("test");
  });

  it("serializes symbols as object key, with proper config", () => {
    const symbolSerializer = new Serializer({
      enable: { objectSymbolIndexing: true },
    });
    const value = {
      [Symbol("test")]: true,
    };

    console.log(symbolSerializer.serialize(value));

    const result = symbolSerializer.deserialize(
      symbolSerializer.serialize(value),
    ) as typeof value;

    const [symbol] = Reflect.ownKeys(result) as [symbol];

    expect(typeof symbol).toBe("symbol");
    expect(symbol.description).toBe("test");
  });
});
