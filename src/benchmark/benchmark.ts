import { performance } from "node:perf_hooks";
import {
  serialize as v8Serialize,
  deserialize as v8Deserialize,
} from "node:v8";

import { stringify as flattedStringify, parse as flattedParse } from "flatted";
import * as devalue from "devalue";
import superjson from "superjson";

import { SerializableClass, Serializer, Transformer } from "../index";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const ITERATIONS = 10_000;
const WARMUP = 100;
const MAX_ERROR_LENGTH = 300;

// -----------------------------------------------------------------------------
// Seriall
// -----------------------------------------------------------------------------

const seriall = new Serializer();

const { serialize: seriallSerialize, deserialize: seriallDeserialize } =
  seriall;

class User extends SerializableClass {
  address: Object;
  root: User | undefined;
  constructor(
    public id: number,
    public name: string,
    public createdAt: Date,
    public metadata: Map<string, unknown>,
  ) {
    super();
  }
}

// seriall.registerClass("usr", User);
seriall.registerTransformer(
  new Transformer<User, any[], { recursive: true }>({
    id: "U",
    recursive: true,
    match: (node) => node instanceof User,
    encode: (user) => [
      user.id,
      user.name,
      user.createdAt,
      user.metadata,
      user.address,
      user.root,
    ],
    decode: (registerNode) => {
      //@ts-ignore
      const node: User = {};
      Object.setPrototypeOf(node, User.prototype);
      const [id, name, createdAt, metadata, address, root] = registerNode(node);
      node.id = id;
      node.name = name;
      node.createdAt = createdAt;
      node.metadata = metadata;
      node.address = address;
      node.root = root;

      return node;
    },
  }),
);

// -----------------------------------------------------------------------------
// devalue custom type support
// -----------------------------------------------------------------------------

/**
 * devalue supports arbitrary custom types through reducers/revivers.
 *
 * The reducer must return a serializable representation of the custom value.
 * That representation is recursively processed by devalue, so Date, Map,
 * Set, BigInt, circular references, etc. continue to work normally.
 */
const devalueReducers = {
  User: (value: unknown) => {
    if (!(value instanceof User)) {
      return false;
    }

    return [
      value.id,
      value.name,
      value.createdAt,
      value.metadata,
      value.address,
      value.root,
    ];
  },
};

const devalueRevivers = {
  User: (value: unknown) => {
    const [id, name, createdAt, metadata, address, root] = value as [
      number,
      string,
      Date,
      Map<string, unknown>,
      object,
      User,
    ];

    const user = new User(id, name, createdAt, metadata);
    user.address = address;
    user.root = root;
  },
};

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

  // Circular reference.
  graph.self = graph;

  // Each user points back to the root.
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

  // Circular root reference.
  graph.self = graph;

  // Shared references.
  graph.primaryAddress = sharedAddress;
  graph.secondaryAddress = sharedAddress;

  for (const user of users) {
    // Shared reference.
    user.address = sharedAddress;

    // Circular reference through the User.
    user.root = graph;
  }

  return graph;
}

// -----------------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------------

function formatError(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message || error.name;

    // devalue exposes the path to the offending value.
    const path = (error as Error & { path?: string }).path;

    if (path) {
      message += ` [path: ${path}]`;
    }
  } else {
    try {
      message = String(error);
    } catch {
      message = "Unknown error";
    }
  }

  // Collapse newlines/whitespace so an exception can never fill the terminal.
  message = message.replace(/\s+/g, " ").trim();

  if (message.length > MAX_ERROR_LENGTH) {
    return `${message.slice(0, MAX_ERROR_LENGTH)}…`;
  }

  return message;
}

function reportError(operation: string, error: unknown) {
  console.error(`[ERROR] ${operation}: ${formatError(error)}`);
}

// -----------------------------------------------------------------------------
// Safe one-time operations
// -----------------------------------------------------------------------------

type SafeResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

function safe<T>(operation: string, fn: () => T): SafeResult<T> {
  try {
    return {
      ok: true,
      value: fn(),
    };
  } catch (error) {
    const message = formatError(error);

    reportError(operation, error);

    return {
      ok: false,
      error: message,
    };
  }
}

// -----------------------------------------------------------------------------
// Benchmark infrastructure
// -----------------------------------------------------------------------------

type BenchmarkResult = {
  name: string;
  totalMs: number;
  opsPerSecond: number;
  error?: string;
};

function benchmark(
  name: string,
  fn: () => void,
  iterations = ITERATIONS,
): BenchmarkResult {
  // Warmup.
  try {
    for (let i = 0; i < WARMUP; i++) {
      fn();
    }
  } catch (error) {
    return {
      name,
      totalMs: 0,
      opsPerSecond: 0,
      error: `warmup failed: ${formatError(error)}`,
    };
  }

  const start = performance.now();

  try {
    for (let i = 0; i < iterations; i++) {
      fn();
    }
  } catch (error) {
    const elapsed = performance.now() - start;

    return {
      name,
      totalMs: elapsed,
      opsPerSecond: 0,
      error: formatError(error),
    };
  }

  const elapsed = performance.now() - start;

  return {
    name,
    totalMs: elapsed,
    opsPerSecond: (iterations / elapsed) * 1000,
  };
}

function format(result: BenchmarkResult) {
  if (result.error) {
    return [result.name.padEnd(30), "ERROR".padStart(10), result.error].join(
      " | ",
    );
  }

  return [
    result.name.padEnd(30),
    `${result.totalMs.toFixed(2).padStart(10)} ms`,
    `${result.opsPerSecond.toFixed(0).padStart(12)} ops/s`,
  ].join(" | ");
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
// Size helpers
// -----------------------------------------------------------------------------

function bytes(value: string | Uint8Array) {
  return typeof value === "string"
    ? Buffer.byteLength(value, "utf8")
    : value.byteLength;
}

function printSize(name: string, value: string | Uint8Array | undefined) {
  if (value === undefined) {
    console.log(`${name.padEnd(12)} unavailable`);
    return;
  }

  console.log(
    `${name.padEnd(12)} ${bytes(value).toLocaleString().padStart(8)} bytes`,
  );
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

// Pre-serialize once for deserialize benchmarks.

const commonSeriallResult = safe("Seriall common graph serialization", () =>
  seriallSerialize(commonGraph),
);

const commonFlattedResult = safe("flatted common graph serialization", () =>
  flattedStringify(commonGraph),
);

const commonDevalueResult = safe("devalue common graph serialization", () =>
  devalue.stringify(commonGraph),
);

const commonSuperjsonResult = safe("superjson common graph serialization", () =>
  superjson.stringify(commonGraph),
);

const commonV8Result = safe("V8 common graph serialization", () =>
  v8Serialize(commonGraph),
);

const commonSeriall = commonSeriallResult.ok
  ? commonSeriallResult.value
  : undefined;

const commonFlatted = commonFlattedResult.ok
  ? commonFlattedResult.value
  : undefined;

const commonDevalue = commonDevalueResult.ok
  ? commonDevalueResult.value
  : undefined;

const commonSuperjson = commonSuperjsonResult.ok
  ? commonSuperjsonResult.value
  : undefined;

const commonV8 = commonV8Result.ok ? commonV8Result.value : undefined;

// -----------------------------------------------------------------------------
// Common graph benchmark
// -----------------------------------------------------------------------------

const commonResults = [
  benchmark("Seriall serialize", () => {
    void seriallSerialize(commonGraph);
  }),

  benchmark("Seriall deserialize", () => {
    if (commonSeriall === undefined) {
      throw new Error("initial serialization failed");
    }

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
    if (commonFlatted === undefined) {
      throw new Error("initial serialization failed");
    }

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
    if (commonDevalue === undefined) {
      throw new Error("initial serialization failed");
    }

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
    if (commonSuperjson === undefined) {
      throw new Error("initial serialization failed");
    }

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
    if (commonV8 === undefined) {
      throw new Error("initial serialization failed");
    }

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

printSize("Seriall:", commonSeriall);
printSize("flatted:", commonFlatted);
printSize("devalue:", commonDevalue);
printSize("superjson:", commonSuperjson);
printSize("V8:", commonV8);

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

const richSeriallResult = safe("Seriall rich graph serialization", () =>
  seriallSerialize(richGraph),
);

const richSeriall = richSeriallResult.ok ? richSeriallResult.value : undefined;

console.log();
console.log("Seriall rich graph");
console.log("------------------");
console.log();

const richSeriallResults = [
  benchmark("Seriall serialize", () => {
    void seriallSerialize(richGraph);
  }),

  benchmark("Seriall deserialize", () => {
    if (richSeriall === undefined) {
      throw new Error("initial serialization failed");
    }

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

const richDevalueResult = safe("devalue rich graph serialization", () =>
  devalue.stringify(richGraph, devalueReducers),
);

const richDevalue = richDevalueResult.ok ? richDevalueResult.value : undefined;

console.log(richSeriall);
console.log(richDevalue);

console.log();
console.log("devalue rich graph");
console.log("------------------");
console.log();

const richDevalueResults = [
  benchmark("devalue serialize", () => {
    void devalue.stringify(richGraph, devalueReducers);
  }),

  benchmark("devalue deserialize", () => {
    if (richDevalue === undefined) {
      throw new Error("initial serialization failed");
    }

    void devalue.parse(richDevalue, devalueRevivers);
  }),

  benchmark("devalue round-trip", () => {
    const encoded = devalue.stringify(richGraph, devalueReducers);

    void devalue.parse(encoded, devalueRevivers);
  }),
];

printResults(richDevalueResults);

// -----------------------------------------------------------------------------
// superjson
// -----------------------------------------------------------------------------

const richSuperjsonResult = safe("superjson rich graph serialization", () =>
  superjson.stringify(richGraph),
);

const richSuperjson = richSuperjsonResult.ok
  ? richSuperjsonResult.value
  : undefined;

console.log();
console.log("superjson rich graph");
console.log("--------------------");
console.log();

const richSuperjsonResults = [
  benchmark("superjson serialize", () => {
    void superjson.stringify(richGraph);
  }),

  benchmark("superjson deserialize", () => {
    if (richSuperjson === undefined) {
      throw new Error("initial serialization failed");
    }

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

printSize("Seriall:", richSeriall);
printSize("devalue:", richDevalue);
printSize("superjson:", richSuperjson);

// -----------------------------------------------------------------------------
// Correctness helpers
// -----------------------------------------------------------------------------

function passFail(value: boolean) {
  return value ? "PASS" : "FAIL";
}

// -----------------------------------------------------------------------------
// Correctness
// -----------------------------------------------------------------------------

console.log();
console.log("Correctness");
console.log("===========");
console.log();

// -----------------------------------------------------------------------------
// Seriall correctness
// -----------------------------------------------------------------------------

if (richSeriall !== undefined) {
  const result = safe(
    "Seriall rich graph deserialization",
    () => seriallDeserialize(richSeriall) as any,
  );

  if (result.ok) {
    const restored = result.value;

    console.log("Seriall circular:", passFail(restored.self === restored));

    console.log(
      "Seriall shared reference:",
      passFail(restored.primaryAddress === restored.secondaryAddress),
    );

    console.log("Seriall Map:", passFail(restored.map instanceof Map));

    console.log("Seriall Set:", passFail(restored.set instanceof Set));

    console.log("Seriall Date:", passFail(restored.dates[0] instanceof Date));

    console.log(
      "Seriall BigInt:",
      passFail(typeof restored.primitives.bigint === "bigint"),
    );

    console.log("Seriall User:", passFail(restored.users[0] instanceof User));

    console.log(
      "Seriall nested shared:",
      passFail(restored.users[0].address === restored.address),
    );

    console.log(
      "Seriall User root:",
      passFail(restored.users[0].root === restored),
    );
  }
} else {
  console.log("Seriall correctness: SKIPPED");
}

// -----------------------------------------------------------------------------
// devalue correctness
// -----------------------------------------------------------------------------

if (richDevalue !== undefined) {
  const result = safe(
    "devalue rich graph deserialization",
    () => devalue.parse(richDevalue, devalueRevivers) as any,
  );

  if (result.ok) {
    const restored = result.value;

    console.log("devalue circular:", passFail(restored.self === restored));

    console.log(
      "devalue shared reference:",
      passFail(restored.primaryAddress === restored.secondaryAddress),
    );

    console.log("devalue Map:", passFail(restored.map instanceof Map));

    console.log("devalue Set:", passFail(restored.set instanceof Set));

    console.log("devalue Date:", passFail(restored.dates[0] instanceof Date));

    console.log(
      "devalue BigInt:",
      passFail(typeof restored.primitives.bigint === "bigint"),
    );

    console.log("devalue User:", passFail(restored.users[0] instanceof User));

    console.log(
      "devalue nested shared:",
      passFail(restored.users[0].address === restored.address),
    );

    console.log(
      "devalue User root:",
      passFail(restored.users[0].root === restored),
    );

    console.log(
      "devalue User metadata:",
      passFail(restored.users[0].metadata instanceof Map),
    );

    console.log(
      "devalue User metadata Set:",
      passFail(restored.users[0].metadata.get("tags") instanceof Set),
    );
  }
} else {
  console.log("devalue correctness: SKIPPED");
}

// -----------------------------------------------------------------------------
// superjson correctness
// -----------------------------------------------------------------------------

if (richSuperjson !== undefined) {
  const result = safe(
    "superjson rich graph deserialization",
    () => superjson.parse(richSuperjson) as any,
  );

  if (result.ok) {
    const restored = result.value;

    console.log("superjson circular:", passFail(restored.self === restored));

    console.log(
      "superjson shared reference:",
      passFail(restored.primaryAddress === restored.secondaryAddress),
    );

    console.log("superjson Map:", passFail(restored.map instanceof Map));

    console.log("superjson Set:", passFail(restored.set instanceof Set));

    console.log("superjson Date:", passFail(restored.dates[0] instanceof Date));

    console.log(
      "superjson BigInt:",
      passFail(typeof restored.primitives.bigint === "bigint"),
    );
  }
} else {
  console.log("superjson correctness: SKIPPED");
}

// -----------------------------------------------------------------------------
// Notes
// -----------------------------------------------------------------------------

console.log();
console.log("Notes");
console.log("=====");
console.log();

console.log("flatted is benchmarked against the common JSON-like graph.");

console.log("Rich-type comparisons use Seriall, devalue, and superjson.");

console.log(
  "devalue uses a custom User reducer/reviver for class preservation.",
);

console.log("V8 is binary and is included as a compact binary baseline.");

console.log("Custom class preservation is tested for Seriall and devalue.");

console.log("Failed operations are reported as ERROR rather than 0 ops/s.");
