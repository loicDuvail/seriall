# Seriall

## TL;DR

**Seriall serializes JavaScript object graphs while preserving references, circular references, special primitive values, built-in types, and registered custom classes.**

**The only JavaScript values not supported out-of-the-box are:**

- ⚠️ Custom classes instances with **JavaScript private fields** (`#field`),

  there are still configurable workarounds, just no out-of-the-box solution

  typescript `private` visibility is generally supported ✅

- 🚫 Any **function / whole class**, for security reasons (e.g: `serialize(MyClass)` or `serialize(myFunction)`)

  even though even this is theoretically configurable

Seriall **does not use `eval` or dynamically execute serialized JavaScript code**. Serialized functions and classes are not supported by default, which helps keep deserialization data-only.

It **conserves refenrential integrity**, so circularly referenced arrays/objects, and cross referenced arrays/objects can be serialized

It **can out-of-the-box register custom classes**, and recreates their instances at deserialization time

It is **highly configurable**, through the usage of `transformers`

## Installation

Inside an npm project: `npm install seriall` or `yarn install seriall`

## Usage

### Basic usage

```ts
// example.ts

import { Serializer } from "seriall";

const { serialize, deserialize } = new Serializer();

// ------- create test data -------

const nested = { name: "Gömböc" };

const myData: any = {
  nestedObjects: [nested, nested],
  name: "It works!",
};

myData.self = myData;

// ------- serialize data -------

const str = serialize(myData);

// -------  -------  -------
// `str` can now go through a network for instance, and be deserialized at the other end like so:
// -------  -------  -------

const revivedData = deserialize(str);

console.log(revivedData.self === revivedData);
// true
console.log(revivedData.nestedObjects[0] === revivedData.nestedObjects[1]);
// true
console.log(revivedData.nestedObjects[0]);
// {name: "Gömböc"}
console.log(revivedData.name);
// It works!
```

### Registering custom classes

```ts
// example.ts

import { Serializer, SerializableClass } from "seriall";

// ------- create a new serializer -------

const serializer = new Serializer();

// ------- create and register custom classes -------

class Address extends SerializableClass {
  country: string;
  city: string;
  constructor(country: string, city: string) {
    super();
    this.country = country;
    this.city = city;
  }

  getFullAddress() {
    return `${this.city}, ${this.country}`;
  }
}

serializer.registerClass("adr", Address);

class User extends SerializableClass {
  name: string;
  friends: User[] = [];
  address: Address | undefined;
  constructor(name: string) {
    super();
    this.name = name;
  }
}

serializer.registerClass("usr", User);

// ------- create test data -------

const mary = new User("Mary");
const john = new User("John");
const paris = new Address("France", "Paris");

mary.address = paris;
john.address = paris;
mary.friends.push(john);
john.friends.push(mary);

const str = serializer.serialize(mary);

// -------  -------  -------
// `str` can now go through a network for instance, and be deserialized at the other end like so:
// -------  -------  -------

const revived = serializer.deserialize(str);

console.log(revived.name);
// mary
console.log(revived.address.getFullAddress());
// Paris, France
console.log(revived.friends[0].name);
// john
console.log(revived.friends[0].friends[0] === revived);
// true
console.log(revived.address === revived.friends[0].address);
// true
```

## Supported

As mentionned earlyer, seriall supports any graph data (objects or arrays), while preserving referential integrity

It also natively support any non-json-primitives:

- `undefined`, `null`, `Infinity`, `-Infinity`, `-0`, `NaN`

as well as JS-specific data-types:

- `Symbols`, `BigInts`

native classes instances

- `Date`, `RegExp`, `Set`, `Map`

and boxed primitives

- `String`, `Number`, `Boolean`

## Advanced Usages

### Symbols

Seriall also preserves symbol identity, including symbols used as object keys. This means you can safely serialize and deserialize objects that use symbols for indexing:

```ts
import { Serializer } from "seriall";

const serializer = new Serializer();

const secretKey = Symbol("secret");

const data = {
  [secretKey]: "Hello from a symbol key!",
};

const serialized = serializer.serialize(data);
const deserialized = serializer.deserialize(serialized);

const restoredKey = Object.getOwnPropertySymbols(deserialized)[0];

console.log(deserialized[restoredKey]);
// "Hello from a symbol key!"

console.log(restoredKey.description);
// "secret"
```

Symbol identity is also preserved across references:

```ts
const key = Symbol("key");

const data = {
  [key]: "value",
  key,
};

const restored = serializer.deserialize(serializer.serialize(data));

const restoredKey = Object.getOwnPropertySymbols(restored)[0];

console.log(restored[restoredKey]);
// "value"

console.log(restored.key === restoredKey);
// true
```

This works because Seriall preserves the object graph, rather than simply converting values to JSON.

## Import Notes

Seriall is exported in both cjs and mjs.

It therefore supports both CommonJS import (`require`) and ES Module import (`import`)

It also exposes both `.d.cts` and `.d.mts` declaration files, and provides therefore type-safety in both environment.

### JavaScript

**ES Module**

```ts
// demo.mjs
import { Serializer } from "seriall";
```

**CommonJS**

```ts
// demo.cjs
const { Serializer } = require("seriall");
```

### Typescript

**ES Module**

```ts
// demo.mts
import { Serializer } from "seriall";
// Serializer is properly typed
```

**CommonJS**

either

```ts
// demo.cts
import seriall = require("seriall");
const { Serializer } = seriall;
// Serializer is now typed properly
```

or

```ts
// demo.cts
const { Serializer } = require("seriall") as typeof import("seriall");
// Serializer is now typed properly
```

## Protocol Versionning

In the advent of a **breaking protocol change**, serializers running on different platforms (e.g client vs server) could
go temporarily out of sync regarding their serialization protocol.

To handle this case, and avoid deserialization data corruption, **Seriall implements protocol version checking before deserializing data**.

The protocol is however **not expected to change**, and especially not frequently.
