import type { Seriall } from "@types";
import { isJsonPrimitive } from "@utils";
import {
  NO_TRANSFORM_DATA,
  LIB,
  PROTOCOL_VERSION,
  SIGNATURE_INDEX,
  DATA_INDEX,
} from "@const";
import { FormatError, LimitError } from "@errors";

export const deserialize = (
  data: string,
  transformers: Record<Seriall.Transformer.Id, Seriall.Transformer>,
  limits: Seriall.Options["limits"],
) => {
  if (data.length > limits.maxPayloadSize) {
    throw new LimitError({ type: "payload", limits, current: data.length });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(data);
  } catch {
    throw new FormatError({ type: "json", value: data });
  }

  const { lib, v, d } = payload;

  if (lib !== LIB) {
    throw new FormatError({ type: "library", value: lib });
  }
  if (v !== PROTOCOL_VERSION) {
    throw new FormatError({ type: "version", value: v });
  }
  if (!Array.isArray(d)) {
    throw new FormatError({ type: "payload", value: d });
  }

  const graph: Seriall.Serialized.Graph = d;

  if (graph.length > limits.maxNodes) {
    throw new LimitError({ limits, current: graph.length, type: "nodes" });
  }

  const revived: Seriall.Serializable[] = [];

  let depth = 0;

  const reviveNode = (index: number) => {
    depth++;

    if (depth > limits.maxDepth) {
      throw new LimitError({ limits, type: "depth" });
    }

    if (index in revived) {
      depth--;
      return revived[index];
    }

    if (graph.length <= index || index < 0) {
      throw new FormatError({ type: "reference", value: index });
    }

    const node = graph[index];

    if (isJsonPrimitive(node)) {
      depth--;
      return node;
    }

    // if node is serialized plain object
    if (!Array.isArray(node) && typeof node === "object") {
      const obj = Object.create(null);
      revived[index] = obj;
      for (const key of Object.keys(node)) {
        obj[key] = reviveNode(node[key]);
      }
      depth--;
      return obj;
    }

    // if node is serialized plain array
    if (typeof node[SIGNATURE_INDEX] !== "string") {
      // cast necessary since typescript doesn't downcast properly type of node
      const typedNode = node as Seriall.Serialized.NodeId[];
      const arr: Seriall.Serializable[] = [];
      revived[index] = arr;
      for (const element of typedNode) {
        arr.push(reviveNode(element));
      }
      depth--;
      return arr;
    }

    // if node is a transformed node (uses a transformer)

    // cast necessary since typescript doesn't downcast properly type of node
    const typedNode = node as Seriall.Serialized.TransformedNode;

    const transformerId = typedNode[SIGNATURE_INDEX];
    const transformer = transformers[transformerId];

    if (!transformerId) {
      throw new Error(`No transformer found for node "${typedNode}"`);
    }
    if (transformer === undefined) {
      throw new Error(`No transformer found with id "${transformerId}"`);
    }

    const nonRecursiveTransformer =
      transformer as unknown as Seriall.Transformer<
        Seriall.Transformer.Decoded,
        Seriall.Transformer.Encoded,
        { recursive: false }
      >;
    const recursiveTransformer = transformer as unknown as Seriall.Transformer<
      Seriall.Transformer.Decoded,
      Seriall.Transformer.Encoded,
      { recursive: true }
    >;

    if (!transformer.recursive && typedNode[DATA_INDEX] === undefined) {
      const decoded = nonRecursiveTransformer.decode(NO_TRANSFORM_DATA);
      revived[index] = decoded;
      depth--;
      return decoded;
    }

    if (!transformer.recursive) {
      const revivedValues = new Array(typedNode.length - 1);
      for (let i = 1; i < typedNode.length; i++) {
        revivedValues[i - 1] = reviveNode(typedNode[i] as number);
      }
      const decoded = nonRecursiveTransformer.decode(revivedValues);
      revived[index] = decoded;
      depth--;
      return decoded;
    }

    const registerNode: Parameters<
      Seriall.Transformer.Decoder<
        Seriall.Transformer.Encoded,
        Seriall.Transformer.Decoded,
        { recursive: true }
      >
    >[0] = (node) => {
      revived[index] = node;
      const revivedValues = new Array(typedNode.length - 1);
      for (let i = 1; i < typedNode.length; i++) {
        const nodeId = typedNode[i] as Seriall.Serialized.NodeId;
        revivedValues[i - 1] = reviveNode(nodeId);
      }
      return revivedValues;
    };

    depth--;
    return recursiveTransformer.decode(registerNode);
  };

  return reviveNode(0);
};
