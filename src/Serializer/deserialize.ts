import type { Cereal } from "../types";
import { defaultDecoder, nativeClasses } from "./serialize.const";
import {
  isPrimitive,
  isSigned,
  isSerializedNative,
  decodeSpecialNumber,
} from "./serialize.utils";

const denormalize =
  (codecs: Map<string, Cereal.ClassCodec<new (...args: any) => any, any>>) =>
  (
    data: Cereal.SerializedGraph,
    revived: Map<number, Cereal.Serializable>,
    index: number,
  ): Cereal.Serializable => {
    if (revived.has(index)) {
      return revived.get(index);
    }

    if (index < 0 || index >= data.length) {
      throw new Error(`Invalid serialized graph reference: ${index}`);
    }

    const node = data[index];

    if (isPrimitive(node)) {
      return node;
    }

    if (Array.isArray(node)) {
      const revivedArray: Cereal.Serializable[] = [];
      revived.set(index, revivedArray);

      node.forEach((id) => {
        const value = denormalize(codecs)(data, revived, id);
        revivedArray.push(value);
      });

      return revivedArray;
    }

    // if node is just a plain object
    if (!isSigned(node)) {
      const revivedObject: Record<string | number, Cereal.Serializable> = {};
      revived.set(index, revivedObject);

      // node's values are nor "string" nor "true" since those two value are reserved to signed serialized objects
      const typedNode = node as Record<string, number>;

      Object.entries(typedNode).forEach(
        ([key, id]) =>
          (revivedObject[key] = denormalize(codecs)(data, revived, id)),
      );

      return revivedObject;
    }

    if (isSerializedNative(node, "$__null")) {
      const revivedNull = null;
      revived.set(index, revivedNull);
      return revivedNull;
    }

    if (isSerializedNative(node, "$__undefined")) {
      const revivedUndefined = undefined;
      revived.set(index, revivedUndefined);
      return revivedUndefined;
    }

    if (isSerializedNative(node, "$__bigint")) {
      const value = denormalize(codecs)(data, revived, node.value) as string;
      const revivedBigInt = BigInt(value);
      revived.set(index, revivedBigInt);
      return revivedBigInt;
    }

    if (isSerializedNative(node, "$__special_number")) {
      const value = denormalize(codecs)(data, revived, node.value) as string;
      const revivedSpecialNumber = decodeSpecialNumber(value);
      revived.set(index, revivedSpecialNumber);
      return revivedSpecialNumber;
    }

    if (isSerializedNative(node, "$__symbol")) {
      const value = denormalize(codecs)(data, revived, node.value) as string;
      const revivedSymbol = Symbol(value);
      revived.set(index, revivedSymbol);
      return revivedSymbol;
    }

    const instanceNode = node as Exclude<
      typeof node,
      Cereal.Revivable<Cereal.NativeRevivableType>
    >;

    let { clazz, decode } = codecs.get(instanceNode.type) || {};

    if (!clazz) {
      throw new Error(
        `Class aliased "${instanceNode.type}" is not registered amongst serializable classes`,
      );
    }

    decode ||= defaultDecoder(clazz);

    if (
      nativeClasses.some((c) => c[0] === instanceNode.type) &&
      !["$__Set", "$__Map"].includes(instanceNode.type)
    ) {
      const revivedInstance = decode(
        denormalize(codecs)(data, revived, instanceNode.value),
      );
      revived.set(index, revivedInstance);
      return revivedInstance;
    }

    if (instanceNode.type === "$__Set") {
      const revivedInstance = new Set();
      revived.set(index, revivedInstance);
      const content = denormalize(codecs)(
        data,
        revived,
        instanceNode.value,
      ) as any[];
      content.forEach((item) => {
        revivedInstance.add(item);
      });
      return revivedInstance;
    }

    if (instanceNode.type === "$__Map") {
      const revivedInstance = new Map();
      revived.set(index, revivedInstance);
      const content = denormalize(codecs)(
        data,
        revived,
        instanceNode.value,
      ) as [string, any][];
      content.forEach(([key, val]) => {
        revivedInstance.set(key, val);
      });
      return revivedInstance;
    }

    const revivedInstance = new clazz({});
    revived.set(index, revivedInstance);

    const encoded = denormalize(codecs)(
      data,
      revived,
      instanceNode.value,
    ) as Record<string, any>;

    Object.assign(revivedInstance, decode(encoded));

    return revivedInstance;
  };

export const deserialize =
  (codecs: Map<string, Cereal.ClassCodec<new (...args: any) => any, any>>) =>
  (data: string) => {
    const normalized: Cereal.SerializedGraph = JSON.parse(data);
    const memory = new Map<number, Cereal.Serializable>();
    const deserialized = denormalize(codecs)(normalized, memory, 0);
    return deserialized;
  };
