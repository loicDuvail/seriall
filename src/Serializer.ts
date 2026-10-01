import {
  createClassTransformer,
  nativeClassesTransformers,
  primitivesTransformers,
} from "./builtin.transformers";
import { deserialize } from "./deserialize";
import { serialize } from "./serialize";
import type { Seriall } from "./types";
import { deepMerge, type Class, type DeepOptional } from "./utils";

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
      (a, b) => (a.priority || Infinity) - (b.priority || Infinity),
    );
    this.transformersMap.set(transformer.id, transformer);
  };

  registerClass = (name: string, clazz: Class) => {
    this.registerTransformer(createClassTransformer(name, clazz));
  };
}
