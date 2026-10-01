import { PRIORITY } from "../const";
import type { Seriall } from "../types";

export class Transformer<
  Decoded extends Seriall.Serializable,
  Encoded extends Seriall.Transformer.Encoded<Options["recursive"]>,
  Options extends { recursive: boolean } = { recursive: false },
> implements Seriall.Transformer<Options["recursive"], Decoded, Encoded> {
  id: Seriall.Transformer.Id;
  recursive?: Options["recursive"] | undefined;
  match: Seriall.Transformer.Matcher<Seriall.Serializable>;
  encode: Seriall.Transformer.Encoder<Decoded, Encoded, Options["recursive"]>;
  decode: Seriall.Transformer.Decoder<Encoded, Decoded, Options["recursive"]>;
  priority: number;

  static PRIORITY = PRIORITY;

  constructor({
    id,
    match,
    encode,
    decode,
    priority,
    recursive,
  }: Seriall.Transformer<Options["recursive"], Decoded, Encoded>) {
    this.id = id;
    this.recursive = recursive;
    this.match = match;
    this.encode = encode;
    this.decode = decode;
    this.priority = priority || PRIORITY.CUSTOM_CLASS;
  }
}
