export namespace Seriall {
  export type Serializable =
    | JsonPrimitive
    | symbol
    | bigint
    | undefined
    | null
    | object
    | Serializable[];

  export type JsonPrimitive = string | number | boolean | null;

  export type MetaData = {
    lib: "seriall";
    v: 1;
  };

  export namespace Serialized {
    export type RevivableNode = { $: Transformer.Id; d?: number };
    export type Node =
      | JsonPrimitive
      | number[]
      | RevivableNode
      | Record<string | number, any>;
    export type Graph = Node[];
  }

  export type Serialized = MetaData & { d: Seriall.Serialized.Graph };

  namespace Transformer {
    /** `NoData` is used to signify that no value should be passed to the Revivable node,
     * which is then only described by its tag ($)*/
    type NoData = undefined;

    type Encoded<Recursive extends boolean> = Recursive extends false
      ? JsonPrimitive | object | Encoded<false>[] | NoData
      : (JsonPrimitive | Encoded<true>)[] | object;

    type Id = string | number;

    type Matcher<T extends Serializable> = (node: T) => boolean;

    type Encoder<
      T extends Serializable,
      O extends Encoded<Recursive>,
      Recursive extends boolean,
    > = (node: T) => O;

    type Decoder<
      T extends Encoded<Recursive>,
      O extends Serializable,
      Recursive extends boolean,
    > = Recursive extends false
      ? (node: T) => O
      : (registerNode: (emptyNode: O) => T) => O;
  }

  export type Transformer<
    Recursive extends boolean = boolean,
    Decoded extends Serializable = Serializable,
    Encoded extends Transformer.Encoded<Recursive> =
      Transformer.Encoded<Recursive>,
  > = {
    id: Transformer.Id;
    priority?: number;
    recursive?: Recursive | undefined;
    match: Transformer.Matcher<Decoded>;
    encode: Transformer.Encoder<Decoded, Encoded, Recursive>;
    decode: Transformer.Decoder<Encoded, Decoded, Recursive>;
  };
}
