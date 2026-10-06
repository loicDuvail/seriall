import type { Seriall } from "../types";
import { Transformer } from "./Transformer";

const ENCODE = Symbol("encode");
const DECODE = Symbol("decode");
const KEYS = Symbol("keys");

export const SYMBOLS = { ENCODE, DECODE };

export abstract class SerializableClass {
  constructor(..._: any) {}

  [ENCODE]() {
    const encoded: object = {};
    for (const key of Object.keys(this)) {
      const value = this[key];
      if (typeof value !== "function") {
        encoded[key] = value;
      }
    }
    return [encoded] as any[];
  }

  static [DECODE] = function <T extends typeof SerializableClass>(
    this: T,
    registerNode: Parameters<
      Seriall.Transformer.Decoder<any[], InstanceType<T>, true>
    >[0],
  ) {
    let revivedInstance: InstanceType<T> = Object.create(this.prototype);
    const [args] = registerNode(revivedInstance);
    Object.assign(revivedInstance, args);
    return revivedInstance;
  };
}

/**
 * Provides better performance than SerializableClass, but at the cost of having to
 * manually specify the instance keys to encode
 */
export abstract class OptimizedSerializableClass extends SerializableClass {
  constructor(_: any) {
    super();
  }

  static [KEYS]: string[];

  [ENCODE]() {
    const encoded: any[] = [];
    for (const key of Object.keys(this)) {
      const value = this[key];
      if (typeof value !== "function") {
        encoded.push(value);
      }
    }
    return encoded;
  }

  static [DECODE] = function <T extends typeof SerializableClass>(
    this: T,
    registerNode: Parameters<
      Seriall.Transformer.Decoder<string[], InstanceType<T>, true>
    >[0],
  ) {
    let revivedInstance: InstanceType<T> = Object.create(this.prototype);
    const args = registerNode(revivedInstance);
    this[KEYS].forEach((key, index) => (revivedInstance[key] = args[index]));
    return revivedInstance;
  };
}

export const createClassTransformer = <T extends typeof SerializableClass>(
  id: string,
  clazz: T,
) =>
  new Transformer<InstanceType<T>, any[], { recursive: true }>({
    id,
    priority: Transformer.PRIORITY.CUSTOM_CLASS,
    recursive: true,
    match: (node) => node instanceof clazz,
    encode: (node) => node[ENCODE](),
    decode: (registerNode) => clazz[DECODE](registerNode),
  });
