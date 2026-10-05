import { deserialize, serialize } from ".";
import {
  createClassTransformer,
  nativeClassesTransformers,
  objectSymbolIndexingTransformer,
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
    objectSymbolIndexing: boolean;
  };
  classes: Record<Seriall.Transformer.Id, typeof SerializableClass>;
};

const defaultOptions: SerializerOptions = {
  enable: {
    builtinPrimitiveTransformers: true,
    builtinNativeClasses: true,
    objectSymbolIndexing: false,
  },
  classes: {},
};

export class Serializer {
  private transformers: Seriall.Transformer[] = [];
  private transformersRecord: Record<
    Seriall.Transformer.Id,
    Seriall.Transformer
  > = {};

  constructor(options: DeepOptional<SerializerOptions> = {}) {
    const opt = deepMerge<SerializerOptions>(defaultOptions, options);

    if (opt.enable.builtinPrimitiveTransformers)
      primitivesTransformers.forEach(this.registerTransformer);
    if (opt.enable.builtinNativeClasses)
      nativeClassesTransformers.forEach(this.registerTransformer);
    if (opt.enable.objectSymbolIndexing) {
      this.registerTransformer(objectSymbolIndexingTransformer);
    }

    for (const className in opt.classes) {
      this.registerClass(className, opt.classes[className]);
    }
  }

  serialize = (data: Seriall.Serializable) =>
    serialize(data, this.transformers);

  deserialize = (data: string) => deserialize(data, this.transformersRecord);

  registerTransformer = (transformer: Seriall.Transformer) => {
    if (transformer.id in this.transformersRecord) {
      throw new Error(
        `A transformer with id "${transformer.id}" is already registered, chose another one`,
      );
    }

    this.transformers.push(transformer);
    this.transformers = this.transformers.sort(
      (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity),
    );

    this.transformersRecord[transformer.id] = transformer;
  };

  deregisterTransformer = (
    transformer: Seriall.Transformer | Seriall.Transformer.Id,
  ) => {
    const id = typeof transformer === "object" ? transformer.id : transformer;

    if (!(id in this.transformersRecord)) {
      throw new Error(
        `No transformer found for id "${id}", cannot deregister it`,
      );
    }

    this.transformers = this.transformers.filter(
      (transformer) => transformer.id !== id,
    );

    delete this.transformersRecord[id];
  };

  registerClass = (name: string, clazz: typeof SerializableClass) => {
    this.registerTransformer(createClassTransformer("$" + name, clazz));
  };

  deregisterClass = (name: string) => {
    this.deregisterTransformer("$" + name);
  };
}
