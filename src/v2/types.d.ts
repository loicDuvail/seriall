export namespace Seriall {
  export type Serializable =
    | JsonPrimitive
    | symbol
    | bigint
    | undefined
    | null
    | object
    | Serializable[];

  export type JsonPrimitive = string | number | boolean;

  export namespace Serialized {
    export type Object = [number, number][];
    export type RevivableNode = { $: Transformer.Id; d?: number };
    export type Node =
      | JsonPrimitive
      | Seriall.Serialized.Object
      | number[]
      | RevivableNode;
    export type Graph = Node[];
  }

  namespace Transformer {
    /** `NoData` is used to signify that no value should be passed to the Revivable node,
     * which is then only described by its tag ($)*/
    type NoData = undefined;
    type Encoded = JsonPrimitive | object | Encoded[] | NoData;
    type Id = string | number;
    type Matcher<T extends Serializable | Encoded> = (node: T) => boolean;
    type Serializer<T extends Serializable, O extends Encoded> = (node: T) => O;
    type Deserializer<T extends Encoded, O extends Serializable> = (
      node: T,
    ) => O;
  }

  export type Transformer<
    Id extends Transformer.Id = Transformer.Id,
    Decoded extends Serializable = Serializable,
    Encoded extends Transformer.Encoded = Transformer.Encoded,
  > = {
    id: Id;
    priority?: number;
    match: Transformer.Matcher<Decoded>;
    encode: Transformer.Serializer<Decoded, Encoded>;
    decode: Transformer.Deserializer<Encoded, Decoded>;
  };
}
