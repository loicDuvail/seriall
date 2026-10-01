import { deserialize, serialize } from ".";
import {
  createClassTransformer,
  nativeClassesTransformers,
  primitivesTransformers,
  type SerializableClass,
} from "../transformer";
import type { DeepOptional } from "../types";
import type { Seriall } from "../types";
import { deepMerge } from "../utils";

type SerializerOptions = {
  enable: {
    builtinPrimitiveTransformers: boolean;
    builtinNativeClasses: boolean;
    builtinClassTransformer: boolean;
  };
};

const defaultOptions: SerializerOptions = {
  enable: {
    builtinPrimitiveTransformers: true,
    builtinNativeClasses: true,
    builtinClassTransformer: true,
  },
};

export class Serializer {
  private transformers: Seriall.Transformer[] = [];
  private transformersMap: Map<Seriall.Transformer.Id, Seriall.Transformer> =
    new Map();

  constructor(options: DeepOptional<SerializerOptions> = {}) {
    const opt = deepMerge<SerializerOptions>(defaultOptions, options);

    if (opt.enable.builtinPrimitiveTransformers)
      primitivesTransformers.forEach(this.registerTransformer);
    if (opt.enable.builtinNativeClasses)
      nativeClassesTransformers.forEach(this.registerTransformer);
  }

  serialize = (data: Seriall.Serializable) =>
    serialize(data, this.transformers);

  deserialize = (data: string) => deserialize(data, this.transformersMap);

  registerTransformer = (transformer: Seriall.Transformer) => {
    if (this.transformersMap.has(transformer.id)) {
      throw new Error(
        `A transformer with id "${transformer.id}" is already registered, chose another one`,
      );
    }

    this.transformers.push(transformer);
    this.transformers = this.transformers.sort(
      (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity),
    );

    this.transformersMap.set(transformer.id, transformer);
  };

  deregisterTransformer = (
    transformer: Seriall.Transformer | Seriall.Transformer.Id,
  ) => {
    const id = typeof transformer === "object" ? transformer.id : transformer;

    if (!this.transformersMap.has(id)) {
      throw new Error(
        `No transformer found for id "${id}", cannot deregister it`,
      );
    }

    this.transformers = this.transformers.filter(
      (transformer) => transformer.id !== id,
    );

    this.transformersMap.delete(id);
  };

  registerClass = (name: string, clazz: typeof SerializableClass) => {
    this.registerTransformer(createClassTransformer("$" + name, clazz));
  };

  deregisterClass = (name: string) => {
    this.deregisterTransformer("$" + name);
  };
}
