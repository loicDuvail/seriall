# Seriall

## TL;DR

**Seriall is a JavaScript data serializer, which can serialize into a string, and deserialize almost any javascript data out of the box**

The only **unsuported datatypes** out-of-the-box are:

- ⚠️ Custom classes instances with **js-private fields** (prefixed with `#`),

  there are still configurable workarounds, just no out-of-the-box solution

  typescript `private` visibility is generally supported ✅

- 🚫 Any **function / whole class**, for security reasons (e.g: `serialize(MyClass)` or `serialize(myFunction)`)

  even though even this is theoretically configurable

It **does not use `eval`**, and is thus safe from any code injection attack.

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

and native classes instances

- `Date`, `RegEx`, `Set`, `Map`, `String`, `Number`, `Boolean`

## Import Notes

Seriall is exported in both cjs and mjs.

It therefore supports both CommonJS import (`require`) and ES Module import (`import`)

It also exposes both `.d.cts` and `.d.mts` declaration files, and provides therefore type-safety in both environment.

### JavaScript

**CommonJS**

```ts
// demo.mjs
import { Serializer } from "seriall";
```

**ES Module**

```ts
// demo.cjs
const { Serializer } = require("seriall");
```

### Typescript

**CommonJS**

```ts
// demo.mts
import { Serializer } from "seriall";
// Serializer is properly typed
```

**ES Module**

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
