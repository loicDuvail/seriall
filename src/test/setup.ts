import { Serializer } from "../serialization";
import type { Seriall } from "../types";

export const serializer = new Serializer();

export const roundtrip = <T extends Seriall.Serializable>(value: T) =>
  serializer.deserialize(serializer.serialize(value)) as T;

export class TestEntity {
  name: string;
  parent: TestEntity | undefined;
  children: TestEntity[] = [];
  self: TestEntity | undefined;

  constructor({ name }: { name: string }) {
    this.name = name;
  }

  method() {
    console.log("this is a method, it should not be serialized");
  }
}
