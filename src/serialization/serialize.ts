import {
  DATA_INDEX,
  LIB,
  NO_TRANSFORM_DATA,
  PROTOCOL_VERSION,
  SIGNATURE_INDEX,
} from "@const";
import type { Seriall } from "@types";
import { isJsonPrimitive } from "@utils";

export const serialize = (
  data: Seriall.Serializable,
  transformers: Seriall.Transformer[],
) => {
  const graph: Seriall.Serialized.Graph = [];
  const seen = new Map<Seriall.Serializable, number>();
  let minusZeroId: number | undefined;

  const addNodeToGraph = (node: Seriall.Serializable): number => {
    let id = Object.is(node, -0) ? minusZeroId : seen.get(node);

    if (id !== undefined) {
      return id;
    }

    id = graph.length;

    if (Object.is(node, -0)) {
      minusZeroId = id;
    } else {
      seen.set(node, id);
    }

    if (isJsonPrimitive(node)) {
      graph.push(node);
      return id;
    }

    const transformer = transformers.find((transformer) =>
      transformer.match(node),
    );

    if (transformer) {
      graph.push([]);
      const revivable = graph[id] as Seriall.Serialized.TransformedNode;
      revivable[SIGNATURE_INDEX] = transformer.id;
      const encoded = transformer.encode(node);
      if (encoded !== NO_TRANSFORM_DATA) {
        encoded.forEach((el, index) => {
          const dataId = addNodeToGraph(el);
          revivable[DATA_INDEX + index] = dataId;
        });
      }
      return id;
    }

    if (Array.isArray(node)) {
      const arr: Seriall.Serialized.NodeId[] = [];
      graph.push(arr);
      for (const element of node) {
        const elementId = addNodeToGraph(element);
        arr.push(elementId);
      }
      return id;
    }

    if (typeof node === "object") {
      const obj: Record<PropertyKey, Seriall.Serialized.NodeId> = {};
      graph.push(obj);
      for (const key in node) {
        const elementId = addNodeToGraph(node[key as keyof typeof node]);
        obj[key] = elementId;
      }
      return id;
    }

    throw new Error(
      `No transformer found for the current value "${node?.toString()}", please add one`,
    );
  };

  addNodeToGraph(data);

  const serialized: Seriall.Serialized = {
    lib: LIB,
    v: PROTOCOL_VERSION,
    d: graph,
  };

  return JSON.stringify(serialized);
};
