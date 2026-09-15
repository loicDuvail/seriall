import type { Seriall } from "../types";
import { nativeClasses } from "./serialize.const";
import { serialize } from "./serialize";
import { deserialize } from "./deserialize";

export class Serializer {
  codecs: Map<
    Seriall.ClassName | Seriall.NativeRevivableClass,
    Seriall.ClassCodec<any, any>
  > = new Map(nativeClasses);

  constructor({
    classes,
  }: {
    classes?: Record<Seriall.ClassName, Seriall.ClassCodec<any, any>>;
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
    className: ClassName & Seriall.NotReserved<ClassName>,
    clazz: I,
    options?: {
      encode?: (instance: InstanceType<I>) => O;
      decode?: (encoded: O) => InstanceType<I>;
    },
  ) => {
    const reservationPrefix: Seriall.ReservationPrefix = "$__";
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
