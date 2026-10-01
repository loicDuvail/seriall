import { NO_TRANSFORM_DATA } from "./const";
import { PRIORITY, Transformer } from "./Transformer";
import type { Seriall } from "./types";
import {
  decodeSpecialNumber,
  encodeSpecialNumber,
  isSpecialNumber,
  type Class,
} from "./utils";

type TransformerPack = Seriall.Transformer[];

// transformers for all non-json-primitive primitives
export const primitivesTransformers: TransformerPack = [
  new Transformer<symbol, { d: string | undefined; f: 0 | 1 }>({
    id: "sym",
    priority: PRIORITY.PRIMITIVE,
    match: (node): node is symbol => typeof node === "symbol",
    encode: (node) => ({
      d: node.description,
      f: Symbol.keyFor(node) === undefined ? 0 : 1,
    }),
    decode: (encoded) => {
      if (encoded.f === 1 && encoded.d) {
        return Symbol.for(encoded.d);
      }
      return Symbol(encoded.d);
    },
  }),
  new Transformer<number, 0 | 1 | 2 | 3>({
    id: "spe",
    priority: PRIORITY.PRIMITIVE,
    match: isSpecialNumber,
    encode: encodeSpecialNumber,
    decode: decodeSpecialNumber,
  }),
  new Transformer<undefined, Seriall.Transformer.NoData>({
    id: "udf",
    priority: PRIORITY.PRIMITIVE,
    match: (node) => node === undefined,
    encode: () => NO_TRANSFORM_DATA,
    decode: () => undefined,
  }),
  new Transformer<null, Seriall.Transformer.NoData>({
    id: "nul",
    priority: PRIORITY.PRIMITIVE,
    match: (node) => node === null,
    encode: () => NO_TRANSFORM_DATA,
    decode: () => null,
  }),
  new Transformer<bigint, string>({
    id: "big",
    priority: PRIORITY.PRIMITIVE,
    match: (node) => typeof node === "bigint",
    encode: (node) => node.toString(),
    decode: (node) => BigInt(node),
  }),
  new Transformer<
    object,
    [PropertyKey, Seriall.Serializable][],
    { recursive: true }
  >({
    id: "obj",
    priority: PRIORITY.PRIMITIVE,
    recursive: true,
    match: (node) => !Array.isArray(node) && typeof node === "object",
    encode: (node) => {
      const obj: [PropertyKey, Seriall.Serializable][] = [];
      for (const key of Reflect.ownKeys(node)) {
        obj.push([key, node[key]]);
      }
      return obj;
    },
    decode: (registerNode) => {
      const obj = {};
      const encoded = registerNode(obj);
      for (const [key, value] of encoded) {
        obj[key] = value;
      }
      return obj;
    },
  }),
];

export const nativeClassesTransformers: TransformerPack = [
  new Transformer<Date, number>({
    id: "Dte",
    priority: PRIORITY.NATIVE_CLASS,
    match: (node) => node instanceof Date,
    encode: (node) => node.getTime(),
    decode: (node) => new Date(node),
  }),
  new Transformer<Set<any>, any[], { recursive: true }>({
    id: "Set",
    priority: PRIORITY.NATIVE_CLASS,
    recursive: true,
    match: (node) => node instanceof Set,
    encode: (node) => Array.from(node),
    decode: (registerNode) => {
      const set = new Set();
      const encoded = registerNode(set);
      for (const element of encoded) {
        set.add(element);
      }
      return set;
    },
  }),
  new Transformer<Map<any, any>, [any, any][], { recursive: true }>({
    id: "Map",
    priority: PRIORITY.NATIVE_CLASS,
    recursive: true,
    match: (node) => node instanceof Map,
    encode: (node) => Array.from(node),
    decode: (registerNode) => {
      const map = new Map();
      const encoded = registerNode(map);
      for (const [key, value] of encoded) {
        map.set(key, value);
      }
      return map;
    },
  }),
  new Transformer<RegExp, { s: string; f: string }>({
    id: "Rgx",
    priority: PRIORITY.NATIVE_CLASS,
    match: (node) => node instanceof RegExp,
    encode: (node) => ({ s: node.source, f: node.flags }),
    decode: (node) => new RegExp(node.s, node.f),
  }),
  new Transformer<String, string>({
    id: "Str",
    priority: PRIORITY.NATIVE_CLASS,
    match: (node) => node instanceof String,
    encode: (node) => node.valueOf(),
    decode: (node) => new String(node),
  }),
  new Transformer<Number, number>({
    id: "Num",
    priority: PRIORITY.NATIVE_CLASS,
    match: (node) => node instanceof Number,
    encode: (node) => node.valueOf(),
    decode: (node) => new Number(node),
  }),
  new Transformer<Boolean, boolean>({
    id: "Bol",
    priority: PRIORITY.NATIVE_CLASS,
    match: (node) => node instanceof Boolean,
    encode: (node) => node.valueOf(),
    decode: (node) => new Boolean(node),
  }),
];

export const createClassTransformer = (name: string, clazz: Class) =>
  new Transformer<object, { $: string; d: object }, { recursive: true }>({
    id: "$" + name,
    priority: PRIORITY.CUSTOM_CLASS,
    recursive: true,
    match: (node) => node instanceof clazz,
    encode: (node) => {
      const encoded = { $: name, d: {} };
      for (const key of Reflect.ownKeys(node)) {
        encoded.d[key] = node[key];
      }
      return encoded;
    },
    decode: (registerNode) => {
      const revivedInstance = {};
      const { $, d } = registerNode(revivedInstance);
      const instance = new clazz(d);
      Object.assign(revivedInstance, instance);
      Object.setPrototypeOf(revivedInstance, clazz.prototype);
      return revivedInstance;
    },
  });
