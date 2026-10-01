import type { Seriall } from "../types/Seriall";
import { isJsonPrimitive } from "../utils/json.utils";
import { DATA_KEY, SIGNATURE_KEY, NO_TRANSFORM_DATA } from "../const";

export const deserialize = (
  data: string,
  transformers: Map<
    Seriall.Transformer.Id,
    Seriall.Transformer<boolean, any, any>
  >,
) => {
  const graph: Seriall.Serialized.Graph = JSON.parse(data);
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

    if (Array.isArray(node)) {
      const arr: Seriall.Serializable[] = [];
      revived.set(index, arr);
      for (const element of node) {
        arr.push(reviveNode(element));
      }
      return arr;
    }

    const transformerId = node[SIGNATURE_KEY];
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

    const dataId = node[DATA_KEY];

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
