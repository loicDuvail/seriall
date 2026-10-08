import type { AnyClass } from "./utils";

export namespace Seriall {
  export type Serializable =
    | JsonPrimitive
    | symbol
    | bigint
    | undefined
    | null
    | Object
    | Serializable[];

  export type JsonPrimitive = string | number | boolean | null;

  export type MetaData = {
    lib: "seriall";
    v: 1;
  };

  export namespace Serialized {
    export type NodeId = number;
    export type TransformedNode = [Transformer.Id, NodeId];
    export type Node =
      | JsonPrimitive
      | NodeId[]
      | TransformedNode
      | Record<string | number, NodeId>;
    export type Graph = Node[];
  }

  export type Serialized = MetaData & { d: Seriall.Serialized.Graph };

  namespace Transformer {
    /** `NoData` is used to signify that no value should be passed to the Revivable node,
     * which is then only described by its tag ($)*/
    type NoData = undefined;

    type Options = { recursive: boolean };

    // even though the final serialized graph only contains json-primitives,
    // encoded values are fed to other transformers, which eventually turn them into json-primitives
    type Encoded = Serializable[] | NoData;
    type Decoded = Serializable;

    type Id = string | number;

    type Matcher = (node: Serializable) => boolean;

    type Encoder<
      Decoded extends Transformer.Decoded,
      Encoded extends Transformer.Encoded,
    > = (node: Decoded) => Encoded;

    type Decoder<
      Encoded extends Transformer.Encoded,
      Decoded extends Transformer.Decoded,
      Options extends Transformer.Options,
    > = (
      arg: Options["recursive"] extends false
        ? Encoded
        : (emptyNode: Decoded) => Encoded,
    ) => Decoded;
  }

  export type Transformer<
    Decoded extends Transformer.Decoded = Transformer.Decoded,
    Encoded extends Transformer.Encoded = Transformer.Encoded,
    Options extends Transformer.Options = Transformer.Options,
  > = {
    id: Transformer.Id;
    priority?: number;
    recursive: Options["recursive"];
    match: Transformer.Matcher;
    encode: Transformer.Encoder<Decoded, Encoded>;
    decode: Transformer.Decoder<Encoded, Decoded, Options>;
  };

  /**
   * Because of the contravariance problem, you cannot use `Seriall.Transformer` as a generic type
   * to encapsulate any specific transformer. This type accomplishes this
   */
  export type AnyTransformer<
    Decoded extends Transformer.Decoded = Transformer.Decoded,
    Encoded extends Transformer.Encoded = Transformer.Encoded,
    Options extends Transformer.Options = Transformer.Options,
  > = {
    id: Transformer.Id;
    priority?: number;
    recursive: Options["recursive"];
    match: Transformer.Matcher;
    // any is used to type codecs params, to avoid contravariance problem
    // when assigning a particular transformer to the default transformer type `Seriall.AnyTransformer`
    encode: Transformer.Encoder<any, Encoded>;
    decode: Transformer.Decoder<any, Decoded, Options>;
  };

  export type Options = {
    enable: {
      builtinPrimitiveTransformers: boolean;
      builtinNativeClasses: boolean;
      objectSymbolIndexing: boolean;
      preservePrototype: boolean;
      preserveDataDescriptors: boolean;
    };
    classes: Record<Seriall.Transformer.Id, AnyClass>;
    limits: {
      maxNodes: number;
      maxDepth: number;
      maxPayloadSize: number;
    };
  };
}
