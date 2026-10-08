# seriall

**seriall** is a data-only serializer for JavaScript object graphs.

It serializes complex JavaScript data while preserving:

- shared references
- circular references
- built-in JavaScript types
- registered custom classes
- symbol and bigint values
- configurable serialization behavior through transformers

Unlike serializers that turn an object into a tree, seriall serializes the **object graph**. This means that two references to the same object remain references to the same object after deserialization.

seriall does not serialize or execute JavaScript functions or classes.

## Installation

npm install seriall

## Quick start

```ts
import { Serializer } from "seriall";

const serializer = new Serializer();

const shared = { name: "Gömböc" };

const data = { first: shared, second: shared };

data.self = data;

const serialized = serializer.serialize(data);
const restored = serializer.deserialize(serialized);

console.log(restored.first === restored.second); // true

console.log(restored.self === restored); // true
```

The serialized value is a JSON string:

`{ "lib": "seriall", "v": 1, "d": [...] }`

The `d` field contains the serialized object graph.

---

## Supported values

### JSON values

seriall supports the usual JSON-compatible values:

- `string`
- `number`
- `boolean`
- `null`
- arrays
- objects

In addition, it preserves JavaScript values that JSON cannot represent directly:

- `undefined`
- `NaN`
- `Infinity`
- `-Infinity`
- `-0`
- `bigint`
- `symbol`

### Built-in classes

The following built-in types are supported by default:

- `Date`
- `RegExp`
- `Set`
- `Map`
- `String`
- `Number`
- `Boolean`

### References and circular structures

References are preserved throughout the graph:

```ts
const shared = { value: 42 };
const data = { a: shared, b: shared };

const restored = serializer.deserialize(serializer.serialize(data));

console.log(restored.a === restored.b); // true
```

Circular references are also supported:

```ts
const data: any = {};
data.self = data;

const restored = serializer.deserialize(serializer.serialize(data));

console.log(restored.self === restored); // true
```

---

## Custom classes

Custom classes can be registered directly with `registerClass()`:

```ts
import { Serializer } from "seriall";

class User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  greet() {
    return `Hello, ${this.name}!`;
  }
}

const serializer = new Serializer();

serializer.registerClass("user", User);

const user = new User("Alice");

const restored = serializer.deserialize(serializer.serialize(user));

console.log(restored instanceof User); // true

console.log(restored.greet()); // Hello, Alice!
```

The registration name becomes part of the serialized format, so the same class registration must be available when deserializing.

Custom classes can also contain recursive and shared references:

```ts
class User {
  name: string;
  friends: User[] = [];

  constructor(name: string) {
    this.name = name;
  }
}

const serializer = new Serializer();

serializer.registerClass("user", User);

const alice = new User("Alice");
const bob = new User("Bob");

alice.friends.push(bob);
bob.friends.push(alice);

const restored = serializer.deserialize(serializer.serialize(alice));

console.log(restored.friends[0].friends[0] === restored); // true
```

### Custom class encoding

`registerClass()` is itself implemented using seriall's transformer system.

For advanced use cases, a registered class can provide custom encoding and decoding behavior through `SYMBOLS.ENCODE` and `SYMBOLS.DECODE`:

```ts
import { Serializer, SYMBOLS } from "seriall";

class User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  [SYMBOLS.ENCODE]: Seriall.Transformer.Encoder<User, [string]> = () => {
    return [this.name];
  };

  static [SYMBOLS.DECODE]: Seriall.Transformer.Decoder<
    [string],
    User,
    { recursive: true }
  > = (registerNode) => {
    const user = Object.create(this.prototype);
    const [name] = registerNode(user);
    user.name = name;
    return user;
  };
}

const serializer = new Serializer();

serializer.registerClass("user", User);
```

`SYMBOLS.ENCODE` receives the instance and returns the values that should be serialized.

`SYMBOLS.DECODE` receives a `registerNode` function. For recursive values, the decoder should register the object before recursively decoding its contents. This allows circular and mutually recursive class instances to be restored correctly.

## Transformers

Transformers are the core extension mechanism of seriall.

A transformer defines:

- `id` — the identifier stored in the serialized graph
- `match` — determines whether the transformer handles a value
- `encode` — converts the value into serializable graph data
- `decode` — reconstructs the value
- `priority` — controls which transformer is selected
- `recursive` — enables recursive/circular decoding

### Example: `URL`

```ts
import { Serializer, Transformer } from "seriall";

const serializer = new Serializer();

serializer.registerTransformer(
  new Transformer({
    id: "url",
    match: (value) => value instanceof URL,
    encode: (value) => [value.toString()],
    decode: ([value]) => new URL(value),
  }),
);

const data = { website: new URL("https://example.com") };

const restored = serializer.deserialize(serializer.serialize(data));

console.log(restored.website instanceof URL); // true
```

### Transformer priority

Transformers are evaluated by priority, with lower values taking precedence.

Built-in priorities are available through:

`Transformer.PRIORITY.CUSTOM_CLASS` `Transformer.PRIORITY.NATIVE_CLASS` `Transformer.PRIORITY.PRIMITIVE`

A custom priority can be created with:

`Transformer.PRIORITY.custom(priority)`

When transformers have the same priority, registration order determines which transformer is selected first.

---

## Optional features

Several features are disabled by default because they increase the amount of data serialized or change the default object representation.

### Symbol-keyed properties

By default, symbol properties are ignored when serializing ordinary objects.

Enable them with:

```ts
const serializer = new Serializer({ enable: { objectSymbolIndexing: true } });

const key = Symbol("secret");

const data = { [key]: "value" };

const restored = serializer.deserialize(serializer.serialize(data));

const restoredKey = Object.getOwnPropertySymbols(restored)[0];

console.log(restored[restoredKey]); // value
```

Symbol identity is preserved as part of the object graph.

---

### Prototype preservation

By default, ordinary objects are deserialized as data containers rather than with their original prototype.

Enable prototype preservation with:

```ts
const serializer = new Serializer({ enable: { preservePrototype: true } });
```

This preserves prototype relationships and their references.

It is disabled by default because most serialized data does not need its prototype chain.

---

### Property descriptor preservation

By default, object properties are restored as regular writable, enumerable and configurable properties.

Data property descriptors can be preserved with:

```ts
const serializer = new Serializer({
  enable: { preserveDataDescriptors: true },
});
```

For example:

```ts
const object = {};

Object.defineProperty(object, "value", {
  value: 42,
  enumerable: false,
  writable: false,
  configurable: false,
});

const restored = serializer.deserialize(serializer.serialize(object));

console.log(Object.getOwnPropertyDescriptor(restored, "value"));
```

The following descriptor fields are preserved:

- `value`
- `writable`
- `enumerable`
- `configurable`

Accessor descriptors (`get` / `set`) are not preserved.

---

## Serializer options

the default configuration is:

```ts
new Serializer({
  enable: {
    builtinPrimitiveTransformers: true,
    builtinNativeClasses: true,
    objectSymbolIndexing: false,
    preservePrototype: false,
    preserveDataDescriptors: false,
  },
  classes: {},
  limits: { maxDepth: 1_000, maxNodes: 15_000, maxPayloadSize: 200_000 },
});
```

All options are optional.

### Built-in transformers

builtinPrimitiveTransformers: true

Enables support for:

- symbols
- special numbers
- `undefined`
- `bigint`

### Built-in native classes

builtinNativeClasses: true

Enables support for:

- `Date`
- `Set`
- `Map`
- `RegExp`
- boxed `String`
- boxed `Number`
- boxed `Boolean`

### Class registration through options

Classes can also be registered when creating the serializer:

```ts
const serializer = new Serializer({
  classes: { user: User, address: Address },
});
```

This is equivalent to calling:

```ts
serializer.registerClass("user", User);
serializer.registerClass("address", Address);
```

### Limits

Deserialization is protected by configurable limits:

```ts
limits: { maxDepth: 1_000, maxNodes: 15_000, maxPayloadSize: 200_000, }
```

These limit:

- maximum recursive depth
- maximum number of graph nodes
- maximum serialized payload size

---

## Serializer API

### `serialize(data)`

Serializes a JavaScript value into a JSON string.

```ts
const serialized = serializer.serialize(data);
```

### `deserialize(data)`

Deserializes a string produced by `serialize()`.

```ts
const data = serializer.deserialize(serialized);
```

### `registerTransformer(transformer)`

Registers a custom transformer.

```ts
serializer.registerTransformer(transformer);
```

Transformer IDs must be unique within a serializer.

### `deregisterTransformer(transformer)`

Removes a transformer by transformer instance or ID:

```ts
serializer.deregisterTransformer("url");
```

### `registerClass(name, class)`

Registers a custom class:

```ts
serializer.registerClass("user", User);
```

Internally, this creates a transformer for the class.

### `deregisterClass(name)`

Removes a registered class:

```ts
serializer.deregisterClass("user");
```

---

## Security

seriall is designed around a **data-only** serialization model.

It does not serialize or execute:

- functions
- class definitions
- arbitrary JavaScript code

Deserialization therefore does not require `eval()` or dynamically generated JavaScript.

However, deserializing untrusted input should still be treated as processing untrusted data. Use appropriate deserialization limits and only register transformers and classes that you trust.

---

## Serialization format

Every serialized value is a JSON string with this top-level structure:

{ lib: "seriall", v: 1, d: [...] }

- `lib` identifies the seriall format.
- `v` identifies the protocol version.
- `d` contains the serialized object graph.

The protocol version allows incompatible future protocol changes to be detected instead of silently deserializing data incorrectly.

A serializer will reject payloads with an incompatible `lib` or `v`.

---

## Why seriall?

seriall is useful when you need to transfer or persist **complex JavaScript object graphs**, rather than simple JSON data.

It is particularly suited to data containing:

- circular references
- shared references
- `Map` / `Set`
- `Date` / `RegExp`
- `BigInt` / `Symbol`
- recursive custom classes
- application-specific types through transformers

This makes seriall a good fit for applications with JavaScript on both the client and server, where complex application data needs to cross a network boundary while retaining its structure and references.

If you only need to serialize simple JSON data, regular `JSON.stringify()` / `JSON.parse()` is usually the simpler choice.

## License

See [LICENSE](./LICENSE).
