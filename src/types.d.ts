export namespace Cereal {
  type ReservationPrefix = `$__`;
  type Reserved<T extends string> = `${ReservationPrefix}${T}`;
  type NotReserved<T extends string> =
    T extends Cereal.Reserved<string> ? never : unknown;

  // signature value cannot be a number,
  // numbers are reserved for serialization referential integrity
  type SignatureValue<T> = Exclude<T, number>;

  type Signature = {
    [K in Reserved<"serialized">]: SignatureValue<true>;
  };

  type Primitive = string | number | boolean;

  export type Serializable =
    | Primitive
    // symbol are currently not supported as object keys (as of v1.0.0)
    | Record<Exclude<PropertyKey, symbol>, any>
    | bigint
    | undefined
    | null
    | symbol
    | Serializable[];

  type NativeRevivableClass = Reserved<
    "Number" | "Date" | "RegExp" | "Set" | "Map" | "String" | "Boolean"
  >;

  type NativeRevivableType = Reserved<
    "special_number" | "bigint" | "symbol" | "null" | "undefined"
  >;

  type RevivableWithoutValue = NativeRevivableType &
    Reserved<"null" | "undefined">;

  type ClassName = string;

  type Revivable<
    T extends NativeRevivableClass | NativeRevivableType | ClassName,
  > = Signature & {
    type: T;
  } & (T extends RevivableWithoutValue ? {} : { value: number });

  type SerializedGraph = (
    | Primitive
    | Record<string, number>
    | number[]
    | Revivable<NativeRevivableClass>
    | Revivable<NativeRevivableType>
    | Revivable<ClassName>
  )[];

  type SerializedNode = SerializedGraph[number];

  type ClassCodec<T extends new (...args: any[]) => object, E> = {
    clazz: T;
    encode?: undefined | ((instance: InstanceType<T>) => E);
    decode?: undefined | ((encoded: E) => InstanceType<T>);
  };
}
