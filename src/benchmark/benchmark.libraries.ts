import { performance } from "node:perf_hooks";
import {
  serialize as v8Serialize,
  deserialize as v8Deserialize,
} from "node:v8";

import { stringify as flattedStringify, parse as flattedParse } from "flatted";
import * as devalue from "devalue";
import superjson from "superjson";

import { SerializableClass, Serializer } from "../index";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const ITERATIONS = 10_000;
const WARMUP = 100;

// -----------------------------------------------------------------------------
// Seriall
// -----------------------------------------------------------------------------

const seriall = new Serializer();

const { serialize: seriallSerialize, deserialize: seriallDeserialize } =
  seriall;

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

seriall.registerClass("usr", User);

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function createCommonGraph() {
  const shared = {
    street: "42 Example Street",
    city: "Paris",
    country: "France",
  };

  const users = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    address: shared,
  }));

  const graph: any = {
    users,
    address: shared,
    primaryAddress: shared,
    secondaryAddress: shared,
  };

  graph.self = graph;

  for (const user of users) {
    //@ts-ignore
    user.root = graph;
  }

  return graph;
}

function createRichGraph() {
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
      new Map<string, unknown>([
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

    map: new Map<string, unknown>([
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

  graph.self = graph;

  graph.primaryAddress = sharedAddress;
  graph.secondaryAddress = sharedAddress;

  for (const user of users) {
    (user as any).address = sharedAddress;
    (user as any).root = graph;
  }

  return graph;
}

// -----------------------------------------------------------------------------
// Benchmark infrastructure
// -----------------------------------------------------------------------------

type BenchmarkResult = {
  name: string;
  totalMs: number;
  opsPerSecond: number;
};

function benchmark(
  name: string,
  fn: () => void,
  iterations = ITERATIONS,
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    fn();
  }

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const elapsed = performance.now() - start;

  return {
    name,
    totalMs: elapsed,
    opsPerSecond: (iterations / elapsed) * 1000,
  };
}

function format(result: BenchmarkResult) {
  return [
    result.name.padEnd(30),
    `${result.totalMs.toFixed(2).padStart(10)} ms`,
    `${result.opsPerSecond.toFixed(0).padStart(12)} ops/s`,
  ].join(" | ");
}

function bytes(value: string | Uint8Array) {
  return typeof value === "string"
    ? Buffer.byteLength(value, "utf8")
    : value.byteLength;
}

function printResults(results: BenchmarkResult[]) {
  console.log(
    "Benchmark".padEnd(30) +
      " | " +
      "Time".padStart(13) +
      " | " +
      "Throughput".padStart(13),
  );

  console.log("-".repeat(63));

  for (const result of results) {
    console.log(format(result));
  }
}

// -----------------------------------------------------------------------------
// Common graph
// -----------------------------------------------------------------------------

console.log();
console.log("Common graph benchmark");
console.log("======================");
console.log();

console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Warmup:     ${WARMUP.toLocaleString()}`);
console.log();

const commonGraph = createCommonGraph();

const commonSeriall = seriallSerialize(commonGraph);
const commonFlatted = flattedStringify(commonGraph);
const commonDevalue = devalue.stringify(commonGraph);
const commonV8 = v8Serialize(commonGraph);
const commonSuperjson = superjson.stringify(commonGraph);

const commonResults = [
  benchmark("Seriall serialize", () => {
    void seriallSerialize(commonGraph);
  }),

  benchmark("Seriall deserialize", () => {
    void seriallDeserialize(commonSeriall);
  }),

  benchmark("Seriall round-trip", () => {
    const encoded = seriallSerialize(commonGraph);
    void seriallDeserialize(encoded);
  }),

  benchmark("flatted serialize", () => {
    void flattedStringify(commonGraph);
  }),

  benchmark("flatted deserialize", () => {
    void flattedParse(commonFlatted);
  }),

  benchmark("flatted round-trip", () => {
    const encoded = flattedStringify(commonGraph);
    void flattedParse(encoded);
  }),

  benchmark("devalue serialize", () => {
    void devalue.stringify(commonGraph);
  }),

  benchmark("devalue deserialize", () => {
    void devalue.parse(commonDevalue);
  }),

  benchmark("devalue round-trip", () => {
    const encoded = devalue.stringify(commonGraph);
    void devalue.parse(encoded);
  }),

  benchmark("superjson serialize", () => {
    void superjson.stringify(commonGraph);
  }),

  benchmark("superjson deserialize", () => {
    void superjson.parse(commonSuperjson);
  }),

  benchmark("superjson round-trip", () => {
    const encoded = superjson.stringify(commonGraph);
    void superjson.parse(encoded);
  }),

  benchmark("V8 serialize", () => {
    void v8Serialize(commonGraph);
  }),

  benchmark("V8 deserialize", () => {
    void v8Deserialize(commonV8);
  }),

  benchmark("V8 round-trip", () => {
    const encoded = v8Serialize(commonGraph);
    void v8Deserialize(encoded);
  }),
];

printResults(commonResults);

// -----------------------------------------------------------------------------
// Common graph sizes
// -----------------------------------------------------------------------------

console.log();
console.log("Common graph size");
console.log("=================");
console.log();

console.log(
  `Seriall:    ${bytes(commonSeriall).toLocaleString().padStart(8)} bytes`,
);

console.log(
  `flatted:    ${bytes(commonFlatted).toLocaleString().padStart(8)} bytes`,
);

console.log(
  `devalue:    ${bytes(commonDevalue).toLocaleString().padStart(8)} bytes`,
);

console.log(
  `superjson:  ${bytes(commonSuperjson).toLocaleString().padStart(8)} bytes`,
);

console.log(
  `V8:         ${bytes(commonV8).toLocaleString().padStart(8)} bytes`,
);

// -----------------------------------------------------------------------------
// Rich graph
// -----------------------------------------------------------------------------

console.log();
console.log("Rich JavaScript graph benchmark");
console.log("================================");
console.log();

const richGraph = createRichGraph();

// -----------------------------------------------------------------------------
// Seriall
// -----------------------------------------------------------------------------

const richSeriall = seriallSerialize(richGraph);

const richSeriallResults = [
  benchmark("Seriall serialize", () => {
    void seriallSerialize(richGraph);
  }),

  benchmark("Seriall deserialize", () => {
    void seriallDeserialize(richSeriall);
  }),

  benchmark("Seriall round-trip", () => {
    const encoded = seriallSerialize(richGraph);
    void seriallDeserialize(encoded);
  }),
];

printResults(richSeriallResults);

// -----------------------------------------------------------------------------
// devalue
// -----------------------------------------------------------------------------

const richDevalue = devalue.stringify(richGraph);

console.log();
console.log("devalue rich graph");
console.log("------------------");
console.log();

const richDevalueResults = [
  benchmark("devalue serialize", () => {
    void devalue.stringify(richGraph);
  }),

  benchmark("devalue deserialize", () => {
    void devalue.parse(richDevalue);
  }),

  benchmark("devalue round-trip", () => {
    const encoded = devalue.stringify(richGraph);
    void devalue.parse(encoded);
  }),
];

printResults(richDevalueResults);

// -----------------------------------------------------------------------------
// superjson
// -----------------------------------------------------------------------------

const richSuperjson = superjson.stringify(richGraph);

console.log();
console.log("superjson rich graph");
console.log("--------------------");
console.log();

const richSuperjsonResults = [
  benchmark("superjson serialize", () => {
    void superjson.stringify(richGraph);
  }),

  benchmark("superjson deserialize", () => {
    void superjson.parse(richSuperjson);
  }),

  benchmark("superjson round-trip", () => {
    const encoded = superjson.stringify(richGraph);
    void superjson.parse(encoded);
  }),
];

printResults(richSuperjsonResults);

// -----------------------------------------------------------------------------
// Rich graph sizes
// -----------------------------------------------------------------------------

console.log();
console.log("Rich graph size");
console.log("===============");
console.log();

console.log(
  `Seriall:    ${bytes(richSeriall).toLocaleString().padStart(8)} bytes`,
);

console.log(
  `devalue:    ${bytes(richDevalue).toLocaleString().padStart(8)} bytes`,
);

console.log(
  `superjson:  ${bytes(richSuperjson).toLocaleString().padStart(8)} bytes`,
);

// -----------------------------------------------------------------------------
// Correctness
// -----------------------------------------------------------------------------

console.log();
console.log("Correctness");
console.log("===========");
console.log();

// Seriall

const seriallRestored = seriallDeserialize(richSeriall) as any;

console.log(
  "Seriall circular:",
  seriallRestored.self === seriallRestored ? "PASS" : "FAIL",
);

console.log(
  "Seriall shared reference:",
  seriallRestored.primaryAddress === seriallRestored.secondaryAddress
    ? "PASS"
    : "FAIL",
);

console.log(
  "Seriall Map:",
  seriallRestored.map instanceof Map ? "PASS" : "FAIL",
);

console.log(
  "Seriall Set:",
  seriallRestored.set instanceof Set ? "PASS" : "FAIL",
);

console.log(
  "Seriall Date:",
  seriallRestored.dates[0] instanceof Date ? "PASS" : "FAIL",
);

console.log(
  "Seriall BigInt:",
  typeof seriallRestored.primitives.bigint === "bigint" ? "PASS" : "FAIL",
);

console.log(
  "Seriall User:",
  seriallRestored.users[0] instanceof User ? "PASS" : "FAIL",
);

console.log(
  "Seriall nested shared:",
  seriallRestored.users[0].address === seriallRestored.address
    ? "PASS"
    : "FAIL",
);

// devalue

const devalueRestored = devalue.parse(richDevalue) as any;

console.log(
  "devalue circular:",
  devalueRestored.self === devalueRestored ? "PASS" : "FAIL",
);

console.log(
  "devalue shared reference:",
  devalueRestored.primaryAddress === devalueRestored.secondaryAddress
    ? "PASS"
    : "FAIL",
);

console.log(
  "devalue Map:",
  devalueRestored.map instanceof Map ? "PASS" : "FAIL",
);

console.log(
  "devalue Set:",
  devalueRestored.set instanceof Set ? "PASS" : "FAIL",
);

console.log(
  "devalue Date:",
  devalueRestored.dates[0] instanceof Date ? "PASS" : "FAIL",
);

console.log(
  "devalue BigInt:",
  typeof devalueRestored.primitives.bigint === "bigint" ? "PASS" : "FAIL",
);

// superjson

const superjsonRestored = superjson.parse(richSuperjson) as any;

console.log(
  "superjson circular:",
  superjsonRestored.self === superjsonRestored ? "PASS" : "FAIL",
);

console.log(
  "superjson shared reference:",
  superjsonRestored.primaryAddress === superjsonRestored.secondaryAddress
    ? "PASS"
    : "FAIL",
);

console.log(
  "superjson Map:",
  superjsonRestored.map instanceof Map ? "PASS" : "FAIL",
);

console.log(
  "superjson Set:",
  superjsonRestored.set instanceof Set ? "PASS" : "FAIL",
);

console.log(
  "superjson Date:",
  superjsonRestored.dates[0] instanceof Date ? "PASS" : "FAIL",
);

console.log(
  "superjson BigInt:",
  typeof superjsonRestored.primitives.bigint === "bigint" ? "PASS" : "FAIL",
);

// -----------------------------------------------------------------------------
// Notes
// -----------------------------------------------------------------------------

console.log();
console.log("Notes");
console.log("=====");
console.log();

console.log("flatted is only benchmarked against the common JSON-like graph.");
console.log("Rich-type comparisons use Seriall, devalue, and superjson.");
console.log("V8 is binary and is included as a compact binary baseline.");
console.log(
  "Custom class preservation is only tested for Seriall in this benchmark.",
);
