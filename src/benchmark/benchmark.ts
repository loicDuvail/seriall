import "./benchmark.libraries";

import { performance } from "node:perf_hooks";
import { SerializableClass, Serializer } from "../index";

const serializer = new Serializer();
const { serialize, deserialize } = serializer;

const ITERATIONS = 10_000;

// -----------------------------------------------------------------------------
// Data model
// -----------------------------------------------------------------------------

class User extends SerializableClass {
  constructor(
    public id: number,
    public name: string,
    public createdAt: Date,
    public metadata: Map<string, unknown>,
  ) {
    super();
  }
}

serializer.registerClass("usr", User);

function createGraph() {
  const sharedAddress = {
    street: "42 Example Street",
    city: "Paris",
    country: "France",
  };

  const users = Array.from({ length: 100 }, (_, i) => {
    return new User(
      i,
      `User ${i}`,
      new Date(2020, i % 12, (i % 28) + 1),
      new Map<string, any>([
        ["active", i % 2 === 0],
        ["score", i * 1.5],
        ["tags", new Set(["typescript", "benchmark", `user-${i}`])],
      ]),
    );
  });

  const graph: any = {
    users,
    address: sharedAddress,

    primitives: {
      undefined: undefined,
      nan: NaN,
      infinity: Infinity,
      negativeInfinity: -Infinity,
      negativeZero: -0,
      bigint: 12345678901234567890n,
      string: "hello world",
      boolean: true,
    },

    map: new Map<string, any>([
      ["users", users],
      ["address", sharedAddress],
    ]),

    set: new Set(users.slice(0, 10)),

    dates: [
      new Date("2020-01-01"),
      new Date("2021-01-01"),
      new Date("2022-01-01"),
    ],
  };

  // Circular reference.
  graph.self = graph;

  // Shared references.
  graph.primaryAddress = sharedAddress;
  graph.secondaryAddress = sharedAddress;

  users.forEach((user) => {
    (user as any).address = sharedAddress;
    (user as any).root = graph;
  });

  return graph;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function benchmark(name: string, fn: () => unknown, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < 100; i++) {
    fn();
  }

  const start = performance.now();

  let result: unknown;

  for (let i = 0; i < iterations; i++) {
    result = fn();
  }

  const elapsed = performance.now() - start;

  return {
    name,
    totalMs: elapsed,
    opsPerSecond: (iterations / elapsed) * 1000,
    lastResult: result,
  };
}

function format(result: ReturnType<typeof benchmark>) {
  return [
    result.name.padEnd(30),
    `${result.totalMs.toFixed(2).padStart(10)} ms`,
    `${result.opsPerSecond.toFixed(0).padStart(12)} ops/s`,
  ].join(" | ");
}

// -----------------------------------------------------------------------------
// Benchmark
// -----------------------------------------------------------------------------

const graph = createGraph();

console.log("Seriall benchmark");
console.log("=================\n");

console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`);

console.log(
  "Benchmark".padEnd(30) +
    " | " +
    "Time".padStart(13) +
    " | " +
    "Throughput".padStart(13),
);

console.log("-".repeat(63));

const results = [
  benchmark("Seriall serialize", () => serialize(graph)),

  benchmark("Seriall round-trip", () => {
    const encoded = serialize(graph);
    return deserialize(encoded);
  }),

  benchmark("JSON stringify", () => {
    // JSON cannot serialize this graph because of the circular reference.
    // Remove it only for a fair JSON baseline.
    const jsonGraph = {
      ...graph,
      self: undefined,
      users: graph.users.map((user: any) => ({
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
        metadata: Object.fromEntries(user.metadata),
      })),
      map: undefined,
      set: undefined,
      primitives: {
        string: graph.primitives.string,
        boolean: graph.primitives.boolean,
      },
    };

    return JSON.stringify(jsonGraph);
  }),

  benchmark("JSON round-trip", () => {
    const jsonGraph = {
      users: graph.users.map((user: any) => ({
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
        metadata: Object.fromEntries(user.metadata),
      })),
      address: graph.address,
      dates: graph.dates,
    };

    return JSON.parse(JSON.stringify(jsonGraph));
  }),
];

for (const result of results) {
  console.log(format(result));
}

// -----------------------------------------------------------------------------
// Size comparison
// -----------------------------------------------------------------------------

console.log("\nSerialized size");
console.log("---------------");

const seriall = serialize(graph);

const json = JSON.stringify({
  users: graph.users.map((user: any) => ({
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    metadata: Object.fromEntries(user.metadata),
  })),
  address: graph.address,
  dates: graph.dates,
});

console.log(`Seriall: ${Buffer.byteLength(seriall, "utf8")} bytes`);
console.log(`JSON:    ${Buffer.byteLength(json, "utf8")} bytes`);

// -----------------------------------------------------------------------------
// Correctness checks
// -----------------------------------------------------------------------------

console.log("\nCorrectness");
console.log("-----------");

const restored = deserialize(seriall) as any;

console.log(
  "Circular reference:",
  restored.self === restored ? "PASS" : "FAIL",
);

console.log(
  "Shared reference:",
  restored.primaryAddress === restored.secondaryAddress ? "PASS" : "FAIL",
);

console.log("Map:", restored.map instanceof Map ? "PASS" : "FAIL");

console.log("Set:", restored.set instanceof Set ? "PASS" : "FAIL");

console.log("Date:", restored.dates[0] instanceof Date ? "PASS" : "FAIL");

console.log(
  "BigInt:",
  typeof restored.primitives.bigint === "bigint" ? "PASS" : "FAIL",
);

console.log(
  "Custom class:",
  restored.users[0] instanceof User ? "PASS" : "FAIL",
);

console.log(
  "Nested shared reference:",
  restored.users[0].address === restored.address ? "PASS" : "FAIL",
);
