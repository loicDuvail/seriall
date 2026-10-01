import type { Seriall } from "../types";
import { Transformer } from "./Transformer";

export abstract class SerializableClass {
  constructor(..._: any) {}

  encode = () => {
    const encoded = {};
    for (const key of Reflect.ownKeys(this)) {
      const value = this[key];
      if (typeof value !== "function") {
        encoded[key] = this[key];
      }
    }
    return encoded;
  };

  static decode = function <T extends typeof SerializableClass>(
    this: T,
    registerNode: Parameters<Seriall.Transformer.Decoder<any, any, true>>[0],
  ) {
    let revivedInstance = {} as InstanceType<T>;
    const args = registerNode(revivedInstance);
    Object.assign(revivedInstance, args);
    Object.setPrototypeOf(revivedInstance, this.prototype);
    return revivedInstance;
  };
}

export const createClassTransformer = <T extends typeof SerializableClass>(
  id: string,
  clazz: T,
) =>
  new Transformer<InstanceType<T>, object, { recursive: true }>({
    id,
    priority: Transformer.PRIORITY.CUSTOM_CLASS,
    recursive: true,
    match: (node) => node instanceof clazz,
    encode: (node) => node.encode(),
    decode: (registerNode) => clazz.decode(registerNode),
  });
