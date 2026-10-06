import { Serializer } from "../serialization";
import { SerializableClass } from "../transformer";
import type { Seriall } from "../types";

export const serializer = new Serializer();

export const roundtrip = <T extends Seriall.Serializable>(value: T) =>
  serializer.deserialize(serializer.serialize(value)) as T;

export class TestEntity extends SerializableClass {
  name: string;
  parent: TestEntity | undefined;
  children: TestEntity[] = [];
  self: TestEntity | undefined;

  constructor({ name }: { name: string }) {
    super();
    this.name = name;
  }

  method() {
    console.log("this is a method, it should not be serialized");
  }
}
