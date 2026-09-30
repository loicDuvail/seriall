import {
  createClassTransformer,
  nativeClassesTransformers,
  primitivesTransformers,
} from "./builtin.transformers";
import { deserialize } from "./deserialize";
import { serialize } from "./serialize";
import type { Seriall } from "./types";
import {
  BidirectionalMap,
  deepMerge,
  type Class,
  type DeepOptional,
} from "./utils";

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
  private transformers: BidirectionalMap<
    Seriall.Transformer.Id,
    Seriall.Transformer
  > = new BidirectionalMap();
  private registeredClasses: BidirectionalMap<string, Class> =
    new BidirectionalMap();

  constructor(options: DeepOptional<SerializerOptions> = {}) {
    const opt = deepMerge<SerializerOptions>(defaultOptions, options);

    if (opt.enable.builtinPrimitiveTransformers)
      primitivesTransformers.forEach(this.registerTransformer);
    if (opt.enable.builtinNativeClasses)
      nativeClassesTransformers.forEach(this.registerTransformer);
  }

  serialize = (data: Seriall.Serializable) =>
    serialize(data, this.transformers);

  deserialize = (data: string) => deserialize(data, this.transformers);

  registerTransformer = (transformer: Seriall.Transformer) => {
    if (this.transformers.has(transformer.id)) {
      throw new Error(
        `A transformer with id "${transformer.id}" is already registered, chose another one`,
      );
    }
    this.transformers.set(transformer.id, transformer);
  };

  registerClass = (name: string, clazz: Class) => {
    this.registerTransformer(createClassTransformer(name, clazz));
  };
}
