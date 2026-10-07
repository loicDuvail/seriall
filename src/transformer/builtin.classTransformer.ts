import type { AnyClass, Seriall } from "../types";
import { Transformer } from "./Transformer";

const ENCODE = Symbol("encode");
const DECODE = Symbol("decode");
const KEYS = Symbol("keys");

export const SYMBOLS = { ENCODE, DECODE, KEYS };

type OptimizedClass = AnyClass & { [KEYS]: PropertyKey[] };

type CustomEncoderClass = AnyClass & {
  prototype: {
    [ENCODE]: () => any[];
  };
};

type CustomDecoderClass = AnyClass & {
  [DECODE]: Seriall.Transformer.Decoder<
    any[],
    InstanceType<CustomDecoderClass>,
    { recursive: true }
  >;
};

const classEncoder = <T extends object>(node: T) => {
  const encoded: Record<PropertyKey, unknown> = {};

  for (const key of Object.keys(node)) {
    const value = node[key as keyof typeof node];
    if (typeof value !== "function") {
      encoded[key] = value;
    }
  }

  return [encoded] as unknown[];
};

const classDecoder =
  <T extends AnyClass>(
    clazz: T,
  ): Seriall.Transformer.Decoder<any[], InstanceType<T>, { recursive: true }> =>
  (registerNode) => {
    const revivedInstance: InstanceType<T> = Object.create(clazz.prototype);

    const [args] = registerNode(revivedInstance);
    Object.assign(revivedInstance, args);

    return revivedInstance;
  };

const optimizedClassEncoder =
  <T extends OptimizedClass>(clazz: T) =>
  (node: InstanceType<T>) => {
    const encoded: unknown[] = [];

    for (const key of clazz[KEYS]) {
      const value = node[key as keyof typeof node];
      if (typeof value !== "function") {
        encoded.push(value);
      }
    }

    return encoded;
  };

export const optimizedClassDecoder =
  <T extends AnyClass & { [KEYS]: PropertyKey[] }>(clazz: T) =>
  (
    registerNode: Parameters<
      Seriall.Transformer.Decoder<any[], InstanceType<T>, { recursive: true }>
    >[0],
  ) => {
    const revivedInstance: InstanceType<T> = Object.create(clazz.prototype);
    const args = registerNode(revivedInstance);

    clazz[KEYS].forEach(
      (key, index) =>
        (revivedInstance[key as keyof typeof revivedInstance] = args[index]),
    );

    return revivedInstance;
  };

export const createClassTransformer = <T extends AnyClass>(
  id: string,
  clazz: T,
) => {
  let encode: Seriall.Transformer.Encoder<InstanceType<T>, any[]>;
  let decode: Seriall.Transformer.Decoder<
    any[],
    InstanceType<T>,
    { recursive: true }
  >;

  if (hasCustomEncoder(clazz)) {
    encode = (node: InstanceType<CustomEncoderClass>) => node[ENCODE]();
  }

  if (hasCustomDecoder(clazz)) {
    decode = clazz[DECODE];
  }

  if (isOptimizedClass(clazz)) {
    encode ||= optimizedClassEncoder(clazz);
    decode ||= optimizedClassDecoder(clazz);
  }

  encode ||= classEncoder;
  decode ||= classDecoder(clazz);

  return new Transformer<InstanceType<T>, any[], { recursive: true }>({
    id,
    priority: Transformer.PRIORITY.CUSTOM_CLASS,
    recursive: true,
    match: (node) => node instanceof clazz,
    encode,
    decode,
  });
};

const isOptimizedClass = (clazz: AnyClass): clazz is OptimizedClass =>
  Object.hasOwn(clazz, KEYS);

const hasCustomEncoder = (clazz: AnyClass): clazz is CustomEncoderClass =>
  Object.hasOwn(clazz.prototype, ENCODE);

const hasCustomDecoder = (clazz: AnyClass): clazz is CustomDecoderClass =>
  Object.hasOwn(clazz, DECODE);
