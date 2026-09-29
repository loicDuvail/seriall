import type { Seriall } from "./types";

export const PRIORITY = {
  PRIMITIVE: 0,
  NATIVE_CLASS: 1,
  CUSTOM_CLASS: 2,
  custom: (priority: number) =>
    (priority <= 0 ? 1 : priority) + PRIORITY.CUSTOM_CLASS,
} as const;

export class Transformer<
  Decoded extends Seriall.Serializable,
  Encoded extends Seriall.Transformer.Encoded,
>
  implements Seriall.Transformer
{
  declare id: Seriall.Transformer.Id;
  declare match: Seriall.Transformer.Matcher<Seriall.Serializable>;
  declare encode: Seriall.Transformer.Serializer<
    Seriall.Serializable,
    Seriall.Transformer.Encoded
  >;
  declare decode: Seriall.Transformer.Deserializer<
    Seriall.Transformer.Encoded,
    Seriall.Serializable
  >;
  declare priority: number;

  constructor({
    id,
    match,
    encode,
    decode,
    priority,
  }: Seriall.Transformer<Seriall.Transformer.Id, Decoded, Encoded>) {
    this.id = id;
    this.match = match;
    this.encode = encode;
    this.decode = decode;
    this.priority = priority || PRIORITY.CUSTOM_CLASS;
  }
}
