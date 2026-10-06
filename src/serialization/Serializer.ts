import { deserialize, serialize } from ".";
import {
  createClassTransformer,
  dataDescriptorPreserverTransformer,
  nativeClassesTransformers,
  objectSymbolIndexingTransformer,
  primitivesTransformers,
  prototypePreserverTransformer,
  type SerializableClass,
} from "../transformer";
import type { DeepOptional, Seriall } from "../types";
import { deepMerge } from "../utils";

const defaultOptions: Seriall.Options = {
  enable: {
    builtinPrimitiveTransformers: true,
    builtinNativeClasses: true,
    objectSymbolIndexing: false,
    preservePrototype: false,
    preserveDataDescriptors: false,
  },
  classes: {},
};

export class Serializer {
  private transformers: Seriall.Transformer[] = [];
  private transformersRecord: Record<
    Seriall.Transformer.Id,
    Seriall.Transformer
  > = {};

  constructor(options: DeepOptional<Seriall.Options> = {}) {
    const opt = deepMerge<Seriall.Options>(defaultOptions, options);

    // transformer registration ordering is intentional
    // only change this code mindfully
    if (opt.enable.builtinPrimitiveTransformers)
      primitivesTransformers.forEach(this.registerTransformer);
    if (opt.enable.builtinNativeClasses)
      nativeClassesTransformers.forEach(this.registerTransformer);
    if (opt.enable.preservePrototype)
      this.registerTransformer(prototypePreserverTransformer);
    if (opt.enable.preserveDataDescriptors)
      this.registerTransformer(dataDescriptorPreserverTransformer);
    if (opt.enable.objectSymbolIndexing)
      this.registerTransformer(objectSymbolIndexingTransformer);

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
