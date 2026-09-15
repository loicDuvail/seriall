import type { Seriall } from "../types";

export const signature: Seriall.Signature = {
  $__serialized: true,
};
export const signatureKey: keyof typeof signature = "$__serialized";
export const signatureValue: (typeof signature)[typeof signatureKey] = true;

export const nativeClasses: [
  Seriall.NativeRevivableClass,
  Seriall.ClassCodec<any, any>,
][] = [
  [
    "$__String",
    {
      clazz: String,
      encode: (instance: String) => instance.toString(),
      decode: (encoded: string) => new String(encoded),
    },
  ],
  [
    "$__Number",
    {
      clazz: Number,
      encode: (instance: Number) => instance.toString(),
      decode: (encoded: string) => new Number(encoded),
    },
  ],
  [
    "$__Boolean",
    {
      clazz: Boolean,
      encode: (instance: Boolean) => instance.toString(),
      decode: (encoded: string) => new Boolean(encoded === "true"),
    },
  ],
  [
    "$__Date",
    {
      clazz: Date,
      encode: (instance: Date) => instance.getTime(),
      decode: (encoded: number) => new Date(encoded),
    },
  ],

  [
    "$__RegExp",
    {
      clazz: RegExp,
      encode: (value: RegExp) => ({ source: value.source, flags: value.flags }),
      decode: (value: { source: string; flags: string }) =>
        new RegExp(value.source, value.flags),
    },
  ],
  [
    "$__Set",
    {
      clazz: Set,
      encode: (instance: Set<unknown>) => Array.from(instance),
      decode: (encoded: Array<unknown>) => new Set(encoded),
    },
  ],
  [
    "$__Map",
    {
      clazz: Map,
      encode: (instance: Map<unknown, unknown>) => Array.from(instance),
      decode: (encoded: Array<[unknown, unknown]>) => new Map(encoded),
    },
  ],
];

export const defaultEncoder = (instance: object) => ({ ...instance });
export const defaultDecoder =
  (clazz: new (...args: any) => any) => (encoded: object) =>
    new clazz(encoded);
