import { serializer, TestEntity } from "./setup";

describe("class registration", () => {
  it("registers and deregisters custom classes", () => {
    expect(() => {
      serializer.registerClass("TestEntity", TestEntity);
    }).not.toThrow();

    expect(() => {
      serializer.deregisterClass("TestEntity");
    }).not.toThrow();
  });

  it("serializes custom class instances", () => {
    serializer.registerClass("TestEntity", TestEntity);
    const testInstance = new TestEntity({ name: "test" });

    expect(
      serializer.deserialize(serializer.serialize(testInstance)),
    ).toBeInstanceOf(TestEntity);

    serializer.deregisterClass("TestEntity");
  });

  it("serializes custom class instances with circular references", () => {
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
