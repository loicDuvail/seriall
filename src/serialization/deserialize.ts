import type { Seriall } from "../types/Seriall";
import { isJsonPrimitive } from "../utils/json.utils";
import {
  DATA_KEY,
  SIGNATURE_KEY,
  NO_TRANSFORM_DATA,
  LIB,
  PROTOCOL_VERSION,
} from "../const";

export const deserialize = (
  data: string,
  transformers: Map<
    Seriall.Transformer.Id,
    Seriall.Transformer<boolean, any, any>
  >,
) => {
  const { lib, v, d } = JSON.parse(data);

  if (lib !== LIB) {
    throw new Error(
      `Can't deserialize data, invalid lib metadata. Expected "${LIB}", got "${lib}"`,
    );
  }

  if (v !== PROTOCOL_VERSION) {
    throw new Error(
      `Can't deserialize data, invalid protocol version. Expected ${PROTOCOL_VERSION}, got ${v}`,
    );
  }

  if (!Array.isArray(d)) {
    throw new Error("Invalid seriall payload: 'd' must be an array");
  }

  const graph: Seriall.Serialized.Graph = d;
  const revived: Map<number, Seriall.Serializable> = new Map();

  const reviveNode = (index: number) => {
    if (revived.has(index)) {
      return revived.get(index);
    }

    if (graph.length <= index || index < 0) {
      throw new Error(`Invalid serialized graph reference: ${index}`);
    }

    const node = graph[index];

    if (isJsonPrimitive(node)) {
      return node;
    }

    if (!Array.isArray(node) && typeof node === "object") {
      const obj = {};
      revived.set(index, obj);
      for (const key in node) {
        obj[key] = reviveNode(node[key]);
      }
      return obj;
    }

    if (Array.isArray(node) && typeof node[0] !== "string") {
      const arr: Seriall.Serializable[] = [];
      revived.set(index, arr);
      for (const element of node) {
        arr.push(reviveNode(element));
      }
      return arr;
    }

    const transformerId = node[0];
    const transformer = transformers.get(transformerId);

    if (!transformerId) {
      throw new Error(`No transformer found for node "${node}"`);
    }
    if (transformer === undefined) {
      throw new Error(`No transformer found with id "${transformerId}"`);
    }

    const nonRecursiveTransformer = transformer as Seriall.Transformer<
      false,
      any,
      any
    >;

    const dataId = node[1];

    if (dataId === undefined) {
      const decoded = nonRecursiveTransformer.decode(NO_TRANSFORM_DATA);
      revived.set(index, decoded);
      return decoded;
    }

    if (!transformer.recursive) {
      const decoded = nonRecursiveTransformer.decode(reviveNode(dataId));
      revived.set(index, decoded);
      return decoded;
    }

    const registerNode: Parameters<
      Seriall.Transformer.Decoder<any, any, true>
    >[0] = (node) => {
      revived.set(index, node);
      return reviveNode(dataId);
    };

    return transformer.decode(registerNode);
  };

  return reviveNode(0);
};
