import { performance } from "node:perf_hooks";
import {
  serialize as v8Serialize,
  deserialize as v8Deserialize,
} from "node:v8";

import { stringify as flattedStringify, parse as flattedParse } from "flatted";
import * as devalue from "devalue";
import superjson from "superjson";

import { Serializer, Transformer } from "@";

// =============================================================================
// Configuration
// =============================================================================

const ITERATIONS = 5_000;
const WARMUP_ITERATIONS = 500;
const ROUNDS = 7;

const MAX_ERROR_LENGTH = 300;

// Set to true while developing/optimizing.
// Set to false for cleaner benchmark output.
const PRINT_SERIALIZED_DATA = false;

// =============================================================================
// Types
// =============================================================================

type BenchmarkFn = () => void;

type BenchmarkResult = {
  name: string;
  totalMs: number;
  opsPerSecond: number;
  error?: string;
};

type AggregateResult = {
  name: string;
  samples: number[];
  median: number;
  min: number;
  max: number;
  p95: number;
  medianOpsPerSecond: number;
};

type BenchmarkCase = {
  name: string;
  fn: BenchmarkFn;
};

// =============================================================================
// Seriall
// =============================================================================

const seriall = new Serializer();

const { serialize: seriallSerialize, deserialize: seriallDeserialize } =
  seriall;

class User {
  address: object | undefined;
  root: User | undefined;
  self: User | undefined;
  friends: User[] = [];

  constructor(
    public id: number,
    public name: string,
    public createdAt: Date,
    public metadata: Map<string, unknown>,
  ) {}
}

// seriall.registerClass("U", User);

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
      user.self,
      user.friends,
    ],

    decode: (registerNode) => {
      // The object must be registered before children are hydrated so that
      // circular references can point back to it.
      // @ts-ignore
      const node: User = {};

      Object.setPrototypeOf(node, User.prototype);

      const [id, name, createdAt, metadata, address, root, self, friends] =
        registerNode(node);

      node.id = id;
      node.name = name;
      node.createdAt = createdAt;
      node.metadata = metadata;
      node.address = address;
      node.root = root;
      node.self = self;
      node.friends = friends;

      return node;
    },
  }),
);

// =============================================================================
// devalue custom type support
// =============================================================================

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
      value.self,
      value.friends,
    ];
  },
};

const devalueRevivers = {
  User: (value: unknown) => {
    const [id, name, createdAt, metadata, address, root, self, friends] =
      value as [
        number,
        string,
        Date,
        Map<string, unknown>,
        object,
        User,
        User,
        User[],
      ];

    const user = new User(id, name, createdAt, metadata);

    user.address = address;
    user.root = root;
    user.self = self;
    user.friends = friends;

    return user;
  },
};

// =============================================================================
// Fixtures
// =============================================================================

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

  const selfUser = new User(
    101,
    `User ${101}`,
    new Date(),
    new Map<string, unknown>(),
  );
  selfUser.self = selfUser;

  users.push(selfUser);

  const crossReferencingUser1 = new User(
    102,
    `User ${102}`,
    new Date(),
    new Map<string, unknown>(),
  );
  const crossReferencingUser2 = new User(
    103,
    `User ${103}`,
    new Date(),
    new Map<string, unknown>(),
  );

  crossReferencingUser1.friends.push(crossReferencingUser2);
  crossReferencingUser2.friends.push(crossReferencingUser1);

  users.push(crossReferencingUser1);
  users.push(crossReferencingUser2);

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
    user.address = sharedAddress;
    user.root = graph;
  }

  return graph;
}

// =============================================================================
// Error handling
// =============================================================================

function formatError(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message || error.name;

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

  message = message.replace(/\s+/g, " ").trim();

  if (message.length > MAX_ERROR_LENGTH) {
    return `${message.slice(0, MAX_ERROR_LENGTH)}…`;
  }

  return message;
}

// =============================================================================
// Utility
// =============================================================================

function bytes(value: string | Uint8Array) {
  return typeof value === "string"
    ? Buffer.byteLength(value, "utf8")
    : value.byteLength;
}

function printSize(name: string, value: string | Uint8Array | undefined) {
  if (value === undefined) {
    console.log(`${name.padEnd(14)} unavailable`);
    return;
  }

  console.log(
    `${name.padEnd(14)} ${bytes(value).toLocaleString().padStart(10)} bytes`,
  );
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function percentile(values: number[], percentile: number) {
  const sorted = [...values].sort((a, b) => a - b);

  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// =============================================================================
// Single benchmark
// =============================================================================

function runBenchmark(
  name: string,
  fn: BenchmarkFn,
  iterations = ITERATIONS,
): BenchmarkResult {
  // Warmup.
  try {
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
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

// =============================================================================
// Multi-round benchmark
// =============================================================================

function runRounds(cases: BenchmarkCase[], rounds = ROUNDS): AggregateResult[] {
  const samples = new Map<string, number[]>();

  for (const benchmarkCase of cases) {
    samples.set(benchmarkCase.name, []);
  }

  for (let round = 0; round < rounds; round++) {
    console.log(
      `  Round ${round + 1}/${rounds} — randomized benchmark order...`,
    );

    const order = shuffle(cases);

    for (const benchmarkCase of order) {
      const result = runBenchmark(benchmarkCase.name, benchmarkCase.fn);

      if (result.error) {
        console.error(`  [ERROR] ${benchmarkCase.name}: ${result.error}`);
        continue;
      }

      samples.get(benchmarkCase.name)!.push(result.totalMs);
    }
  }

  return cases.map((benchmarkCase) => {
    const values = samples.get(benchmarkCase.name)!;

    const med = median(values);

    return {
      name: benchmarkCase.name,
      samples: values,
      median: med,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: percentile(values, 95),
      medianOpsPerSecond: (ITERATIONS / med) * 1000,
    };
  });
}

// =============================================================================
// Reporting
// =============================================================================

function printAggregateResults(results: AggregateResult[]) {
  console.log();

  console.log(
    "Benchmark".padEnd(30) +
      " | " +
      "Median".padStart(12) +
      " | " +
      "Min".padStart(12) +
      " | " +
      "Max".padStart(12) +
      " | " +
      "p95".padStart(12) +
      " | " +
      "Ops/s".padStart(12),
  );

  console.log("-".repeat(100));

  for (const result of results) {
    console.log(
      result.name.padEnd(30) +
        " | " +
        `${result.median.toFixed(2)} ms`.padStart(12) +
        " | " +
        `${result.min.toFixed(2)} ms`.padStart(12) +
        " | " +
        `${result.max.toFixed(2)} ms`.padStart(12) +
        " | " +
        `${result.p95.toFixed(2)} ms`.padStart(12) +
        " | " +
        `${result.medianOpsPerSecond.toFixed(0)}`.padStart(12),
    );
  }
}

// =============================================================================
// Relative performance
// =============================================================================

function printRelativePerformance(results: AggregateResult[]) {
  const fastest = Math.min(...results.map((result) => result.median));

  console.log();
  console.log("Relative performance");
  console.log("--------------------");

  for (const result of results) {
    const relative = result.median / fastest;

    console.log(`${result.name.padEnd(30)} ${relative.toFixed(2)}x`);
  }
}

// =============================================================================
// Correctness
// =============================================================================

function passFail(value: boolean) {
  return value ? "PASS" : "FAIL";
}

function runCorrectnessChecks(name: string, deserialize: () => any) {
  console.log();
  console.log(`${name} correctness`);
  console.log("--------------------");

  try {
    const restored = deserialize();

    console.log("circular:".padEnd(24), passFail(restored.self === restored));

    console.log(
      "shared reference:".padEnd(24),
      passFail(restored.primaryAddress === restored.secondaryAddress),
    );

    console.log("Map:".padEnd(24), passFail(restored.map instanceof Map));

    console.log("Set:".padEnd(24), passFail(restored.set instanceof Set));

    console.log(
      "Date:".padEnd(24),
      passFail(restored.dates[0] instanceof Date),
    );

    console.log(
      "BigInt:".padEnd(24),
      passFail(typeof restored.primitives.bigint === "bigint"),
    );

    console.log(
      "User:".padEnd(24),
      passFail(restored.users[0] instanceof User),
    );

    console.log(
      "nested shared:".padEnd(24),
      passFail(restored.users[0].address === restored.address),
    );

    console.log(
      "User root:".padEnd(24),
      passFail(restored.users[0].root === restored),
    );

    console.log(
      "User metadata:".padEnd(24),
      passFail(restored.users[0].metadata instanceof Map),
    );

    console.log(
      "Self referencing user:".padEnd(24),
      passFail(restored.users[100].self === restored.users[100]),
    );

    console.log(
      "Cross referencing users:".padEnd(24),
      passFail(
        restored.users[101].friends[0].friends[0] === restored.users[101],
      ),
    );

    console.log(
      "User metadata Set:".padEnd(24),
      passFail(restored.users[0].metadata.get("tags") instanceof Set),
    );
  } catch (error) {
    console.error(`[ERROR] ${name}: ${formatError(error)}`);
  }
}

// =============================================================================
// Common graph
// =============================================================================

function benchmarkCommonGraph() {
  console.log();
  console.log("=".repeat(100));
  console.log("COMMON GRAPH");
  console.log("=".repeat(100));

  const graph = createCommonGraph();

  // ---------------------------------------------------------------------------
  // Pre-serialize
  // ---------------------------------------------------------------------------

  const seriallEncoded = seriallSerialize(graph);
  const flattedEncoded = flattedStringify(graph);
  const devalueEncoded = devalue.stringify(graph);
  const superjsonEncoded = superjson.stringify(graph);
  const v8Encoded = v8Serialize(graph);

  // ---------------------------------------------------------------------------
  // Sizes
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Serialized sizes");
  console.log("-----------------");

  printSize("Seriall:", seriallEncoded);
  printSize("flatted:", flattedEncoded);
  printSize("devalue:", devalueEncoded);
  printSize("superjson:", superjsonEncoded);
  printSize("V8:", v8Encoded);

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Serialization");
  console.log("-------------");

  const serializationCases: BenchmarkCase[] = [
    {
      name: "seriall serialize",
      fn: () => {
        void seriallSerialize(graph);
      },
    },

    {
      name: "flatted serialize",
      fn: () => {
        void flattedStringify(graph);
      },
    },

    {
      name: "devalue serialize",
      fn: () => {
        void devalue.stringify(graph);
      },
    },

    {
      name: "superjson serialize",
      fn: () => {
        void superjson.stringify(graph);
      },
    },

    {
      name: "V8 serialize",
      fn: () => {
        void v8Serialize(graph);
      },
    },
  ];

  const serializationResults = runRounds(serializationCases);

  printAggregateResults(serializationResults);
  printRelativePerformance(serializationResults);

  // ---------------------------------------------------------------------------
  // Deserialization
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Deserialization");
  console.log("----------------");

  const deserializationCases: BenchmarkCase[] = [
    {
      name: "seriall deserialize",
      fn: () => {
        void seriallDeserialize(seriallEncoded);
      },
    },

    {
      name: "flatted deserialize",
      fn: () => {
        void flattedParse(flattedEncoded);
      },
    },

    {
      name: "devalue deserialize",
      fn: () => {
        void devalue.parse(devalueEncoded);
      },
    },

    {
      name: "superjson deserialize",
      fn: () => {
        void superjson.parse(superjsonEncoded);
      },
    },

    {
      name: "V8 deserialize",
      fn: () => {
        void v8Deserialize(v8Encoded);
      },
    },
  ];

  const deserializationResults = runRounds(deserializationCases);

  printAggregateResults(deserializationResults);
  printRelativePerformance(deserializationResults);

  // ---------------------------------------------------------------------------
  // Round-trip
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Round-trip");
  console.log("----------");

  const roundTripCases: BenchmarkCase[] = [
    {
      name: "seriall round-trip",
      fn: () => {
        const encoded = seriallSerialize(graph);
        void seriallDeserialize(encoded);
      },
    },

    {
      name: "flatted round-trip",
      fn: () => {
        const encoded = flattedStringify(graph);
        void flattedParse(encoded);
      },
    },

    {
      name: "devalue round-trip",
      fn: () => {
        const encoded = devalue.stringify(graph);
        void devalue.parse(encoded);
      },
    },

    {
      name: "superjson round-trip",
      fn: () => {
        const encoded = superjson.stringify(graph);
        void superjson.parse(encoded);
      },
    },

    {
      name: "V8 round-trip",
      fn: () => {
        const encoded = v8Serialize(graph);
        void v8Deserialize(encoded);
      },
    },
  ];

  const roundTripResults = runRounds(roundTripCases);

  printAggregateResults(roundTripResults);
  printRelativePerformance(roundTripResults);
}

// =============================================================================
// Rich graph
// =============================================================================

function benchmarkRichGraph() {
  console.log();
  console.log("=".repeat(100));
  console.log("RICH JAVASCRIPT GRAPH");
  console.log("=".repeat(100));

  const graph = createRichGraph();

  const seriallEncoded = seriallSerialize(graph);
  const devalueEncoded = devalue.stringify(graph, devalueReducers);

  let superjsonEncoded: string | undefined;

  try {
    superjsonEncoded = superjson.stringify(graph);
  } catch (error) {
    console.log();
    console.log(
      `superjson does not support this circular rich graph: ${formatError(error)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Sizes
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Serialized sizes");
  console.log("-----------------");

  printSize("Seriall:", seriallEncoded);
  printSize("devalue:", devalueEncoded);
  printSize("superjson:", superjsonEncoded);

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Serialization");
  console.log("-------------");

  const serializationCases: BenchmarkCase[] = [
    {
      name: "seriall serialize",
      fn: () => {
        void seriallSerialize(graph);
      },
    },

    {
      name: "devalue serialize",
      fn: () => {
        void devalue.stringify(graph, devalueReducers);
      },
    },
  ];

  if (superjsonEncoded !== undefined) {
    serializationCases.push({
      name: "superjson serialize",
      fn: () => {
        void superjson.stringify(graph);
      },
    });
  }

  const serializationResults = runRounds(serializationCases);

  printAggregateResults(serializationResults);
  printRelativePerformance(serializationResults);

  // ---------------------------------------------------------------------------
  // Deserialization
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Deserialization");
  console.log("----------------");

  const deserializationCases: BenchmarkCase[] = [
    {
      name: "seriall deserialize",
      fn: () => {
        void seriallDeserialize(seriallEncoded);
      },
    },

    {
      name: "devalue deserialize",
      fn: () => {
        void devalue.parse(devalueEncoded, devalueRevivers);
      },
    },
  ];

  if (superjsonEncoded !== undefined) {
    deserializationCases.push({
      name: "superjson deserialize",
      fn: () => {
        void superjson.parse(superjsonEncoded);
      },
    });
  }

  const deserializationResults = runRounds(deserializationCases);

  printAggregateResults(deserializationResults);
  printRelativePerformance(deserializationResults);

  // ---------------------------------------------------------------------------
  // Round-trip
  // ---------------------------------------------------------------------------

  console.log();
  console.log("Round-trip");
  console.log("----------");

  const roundTripCases: BenchmarkCase[] = [
    {
      name: "seriall round-trip",
      fn: () => {
        const encoded = seriallSerialize(graph);
        void seriallDeserialize(encoded);
      },
    },

    {
      name: "devalue round-trip",
      fn: () => {
        const encoded = devalue.stringify(graph, devalueReducers);
        void devalue.parse(encoded, devalueRevivers);
      },
    },
  ];

  if (superjsonEncoded !== undefined) {
    roundTripCases.push({
      name: "superjson round-trip",
      fn: () => {
        const encoded = superjson.stringify(graph);
        void superjson.parse(encoded);
      },
    });
  }

  const roundTripResults = runRounds(roundTripCases);

  printAggregateResults(roundTripResults);
  printRelativePerformance(roundTripResults);

  // ---------------------------------------------------------------------------
  // Correctness
  // ---------------------------------------------------------------------------

  runCorrectnessChecks("Seriall", () => seriallDeserialize(seriallEncoded));

  runCorrectnessChecks("devalue", () =>
    devalue.parse(devalueEncoded, devalueRevivers),
  );

  if (superjsonEncoded !== undefined) {
    runCorrectnessChecks("superjson", () => superjson.parse(superjsonEncoded));
  }
}

// =============================================================================
// Optional serialized-data output
// =============================================================================

function printSerializedData(name: string, value: string | Uint8Array) {
  if (!PRINT_SERIALIZED_DATA) {
    return;
  }

  console.log();
  console.log(name);
  console.log("-".repeat(name.length));

  if (typeof value === "string") {
    console.log(value);
  } else {
    console.log(Buffer.from(value).toString("hex"));
  }
}

// =============================================================================
// Main
// =============================================================================

console.log();
console.log("SERIALIZATION BENCHMARK");
console.log("=======================");
console.log();

console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Warmup:     ${WARMUP_ITERATIONS.toLocaleString()}`);
console.log(`Rounds:     ${ROUNDS.toLocaleString()}`);
console.log("Order:      randomized every round");
console.log("Statistic:  median / min / max / p95");
console.log();

benchmarkCommonGraph();
benchmarkRichGraph();

console.log();
console.log("Benchmark complete.");
