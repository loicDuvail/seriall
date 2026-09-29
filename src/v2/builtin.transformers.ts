import { NO_TRANSFORM_DATA } from "./const";
import { PRIORITY, Transformer } from "./Transformer";
import type { Seriall } from "./types";
import {
  decodeSpecialNumber,
  encodeSpecialNumber,
  isSpecialNumber,
} from "./utils";

type TransformerPack = [
  Seriall.Transformer.Id,
  Seriall.Transformer<
    Seriall.Transformer.Id,
    Seriall.Serializable,
    Seriall.Transformer.Encoded
  >,
][];

// transformers for all non-json-primitive primitives
const primitivesTransformers: TransformerPack = [
  [
    "sym",
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
  ],
  [
    "spe",
    new Transformer<number, 0 | 1 | 2 | 3>({
      id: "spe",
      priority: PRIORITY.PRIMITIVE,
      match: isSpecialNumber,
      encode: encodeSpecialNumber,
      decode: decodeSpecialNumber,
    }),
  ],
  [
    "udf",
    new Transformer<undefined, Seriall.Transformer.NoData>({
      id: "udf",
      priority: PRIORITY.PRIMITIVE,
      match: (node) => node === undefined,
      encode: () => NO_TRANSFORM_DATA,
      decode: () => undefined,
    }),
  ],
  [
    "nul",
    new Transformer<null, Seriall.Transformer.NoData>({
      id: "nul",
      priority: PRIORITY.PRIMITIVE,
      match: (node) => node === null,
      encode: () => NO_TRANSFORM_DATA,
      decode: () => null,
    }),
  ],
  [
    "big",
    new Transformer<bigint, string>({
      id: "big",
      priority: PRIORITY.PRIMITIVE,
      match: (node) => typeof node === "bigint",
      encode: (node) => node.toString(),
      decode: (node) => BigInt(node),
    }),
  ],
  [
    "obj",
    new Transformer<object, [PropertyKey, Seriall.Serializable][]>({
      id: "obj",
      priority: PRIORITY.PRIMITIVE,
      match: (node) => typeof node === "object",
      encode: (node) => {
        const obj: [PropertyKey, Seriall.Serializable][] = [];
        for (const key of Reflect.ownKeys(node)) {
          obj.push([key, node[key]]);
        }
        return obj;
      },
      decode: (encoded) => {
        const obj = {};
        for (const [key, value] of encoded) {
          obj[key] = value;
        }
        return obj;
      },
    }),
  ],
];

const nativeClassesTransformers: TransformerPack = [
  [
    "dte",
    new Transformer<Date, number>({
      id: "dte",
      priority: PRIORITY.NATIVE_CLASS,
      match: (node) => node instanceof Date,
      encode: (node) => node.getTime(),
      decode: (node) => new Date(node),
    }),
  ],
  [
    "set",
    new Transformer<Set<any>, any[]>({
      id: "set",
      priority: PRIORITY.NATIVE_CLASS,
      match: (node) => node instanceof Set,
      encode: (node) => Array.from(node),
      decode: (encoded) => {
        const set = new Set();
        for (const element of encoded) {
          set.add(element);
        }
        return set;
      },
    }),
  ],
  [
    "map",
    new Transformer<Map<any, any>, [any, any][]>({
      id: "map",
      priority: PRIORITY.NATIVE_CLASS,
      match: (node) => node instanceof Map,
      encode: (node) => Array.from(node),
      decode: (encoded) => {
        const map = new Map();
        for (const [key, value] of encoded) {
          map.set(key, value);
        }
        return map;
      },
    }),
  ],
];
