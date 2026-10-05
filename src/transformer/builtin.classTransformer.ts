import type { Seriall } from "../types";
import { Transformer } from "./Transformer";

const ENCODE = Symbol("encode");
const DECODE = Symbol("decode");

export const SYMBOLS = { ENCODE, DECODE };

export abstract class SerializableClass {
  constructor(..._: any) {}

  [ENCODE]() {
    const encoded: any = [];
    for (const key of Reflect.ownKeys(this)) {
      const value = this[key];
      if (typeof value !== "function") {
        encoded.push(this[key]);
      }
    }
    return encoded;
  }

  static [DECODE] = function <T extends typeof SerializableClass>(
    this: T,
    registerNode: Parameters<Seriall.Transformer.Decoder<any, any, true>>[0],
  ) {
    let revivedInstance = {} as InstanceType<T>;
    const args = registerNode(revivedInstance);
    //@ts-expect-error
    const keys = Reflect.ownKeys(new this({}));
    keys.forEach((key, index) => (revivedInstance[key] = args[index]));
    Object.setPrototypeOf(revivedInstance, this.prototype);
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
