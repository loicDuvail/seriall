import { Serializer } from "../serialization";
import type { Seriall } from "../types";

export const serializer = new Serializer();

export const roundtrip = <T extends Seriall.Serializable>(value: T) =>
  serializer.deserialize(serializer.serialize(value)) as T;
