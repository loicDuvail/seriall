import { PRIORITY } from "../const";
import type { DeepOptional, Seriall } from "../types";

type TransformerParams<
  Decoded extends Seriall.Transformer.Decoded,
  Encoded extends Seriall.Transformer.Encoded,
  Options extends Seriall.Transformer.Options,
> = Omit<Seriall.Transformer<Decoded, Encoded, Options>, "recursive"> &
  (Options["recursive"] extends true
    ? { recursive: true }
    : { recursive?: false });

export class Transformer<
  Decoded extends Seriall.Transformer.Decoded,
  Encoded extends Seriall.Transformer.Encoded,
  Options extends Seriall.Transformer.Options = { recursive: false },
> implements Seriall.Transformer<Decoded, Encoded, Options> {
  id: Seriall.Transformer.Id;
  recursive: Options["recursive"];
  match: Seriall.Transformer.Matcher;
  encode: Seriall.Transformer.Encoder<Decoded, Encoded>;
  decode: Seriall.Transformer.Decoder<Encoded, Decoded, Options>;
  priority: number;

  static PRIORITY = PRIORITY;

  constructor({
    id,
    match,
    encode,
    decode,
    priority,
    recursive,
  }: TransformerParams<Decoded, Encoded, Options>) {
    this.id = id;
    this.priority = priority || PRIORITY.CUSTOM_CLASS;
    this.recursive = recursive || false;
    this.match = match;
    this.encode = encode;
    this.decode = decode;
  }
}
