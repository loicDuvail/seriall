import type { Cereal } from "../types";
import { nativeClasses } from "./serialize.const";
import { serialize } from "./serialize";
import { deserialize } from "./deserialize";

export class Serializer {
  codecs: Map<
    Cereal.ClassName | Cereal.NativeRevivableClass,
    Cereal.ClassCodec<any, any>
  > = new Map(nativeClasses);

  constructor({
    classes,
  }: {
    classes?: Record<Cereal.ClassName, Cereal.ClassCodec<any, any>>;
  } = {}) {
    if (classes) {
      Object.assign(this.codecs, classes);
    }
  }

  registerClass = <
    I extends new (...args: any) => any,
    O,
    ClassName extends string,
  >(
    className: ClassName & Cereal.NotReserved<ClassName>,
    clazz: I,
    options?: {
      encode?: (instance: InstanceType<I>) => O;
      decode?: (encoded: O) => InstanceType<I>;
    },
  ) => {
    const reservationPrefix: Cereal.ReservationPrefix = "$__";
    if (className.startsWith(reservationPrefix)) {
      throw new Error(
        `Class name "${className}" is reserved for serialization.`,
      );
    }
    const _class = className as string;

    this.codecs.set(_class, {
      clazz,
      encode: options?.encode,
      decode: options?.decode,
    });

    this.serialize = serialize(this.codecs);
    this.deserialize = deserialize(this.codecs);
  };

  serialize = serialize(this.codecs);
  deserialize = deserialize(this.codecs);
}
