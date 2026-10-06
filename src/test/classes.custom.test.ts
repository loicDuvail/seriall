import { SerializableClass } from "../transformer";
import { serializer } from "./setup";

describe("class registration", () => {
  it("registers and deregisters custom classes", () => {
    class TestEntity extends SerializableClass {}

    expect(() => {
      serializer.registerClass("TestEntity", TestEntity);
    }).not.toThrow();

    expect(() => {
      serializer.deregisterClass("TestEntity");
    }).not.toThrow();
  });

  it("serializes custom class instances", () => {
    class TestEntity extends SerializableClass {}

    serializer.registerClass("TestEntity", TestEntity);
    const testInstance = new TestEntity();

    expect(
      serializer.deserialize(serializer.serialize(testInstance)),
    ).toBeInstanceOf(TestEntity);

    serializer.deregisterClass("TestEntity");
  });

  it("serializes custom class instances with circular references", () => {
    class TestEntity extends SerializableClass {
      name: string;
      parent: TestEntity | undefined;
      children: TestEntity[] = [];
      self: TestEntity | undefined;

      constructor({ name }: { name: string }) {
        super();
        this.name = name;
      }
    }

    serializer.registerClass("TestEntity", TestEntity);

    const parent = new TestEntity({ name: "parent" });
    const child = new TestEntity({ name: "child" });

    // Parent -> child
    parent.children.push(child);
    child.parent = parent;

    // Direct self-reference
    parent.self = parent;

    // Child -> child
    child.self = child;

    const serialized = serializer.serialize(parent);
    const revived = serializer.deserialize(serialized);

    // Instances are restored
    expect(revived).toBeInstanceOf(TestEntity);
    expect(revived.children[0]).toBeInstanceOf(TestEntity);

    // Values are preserved
    expect(revived.name).toBe("parent");
    expect(revived.children[0].name).toBe("child");

    // Circular references are preserved
    expect(revived.self).toBe(revived);
    expect(revived.children[0].parent).toBe(revived);
    expect(revived.children[0].self).toBe(revived.children[0]);

    // The child isn't duplicated during deserialization
    expect(revived.children[0]).toBe(revived.children[0].parent.children[0]);

    serializer.deregisterClass("TestEntity");
  });
});
