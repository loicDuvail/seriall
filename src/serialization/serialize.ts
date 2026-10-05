import {
  DATA_INDEX,
  LIB,
  NO_TRANSFORM_DATA,
  PROTOCOL_VERSION,
  SIGNATURE_INDEX,
} from "../const";
import type { Seriall } from "../types/Seriall";
import { isJsonPrimitive } from "../utils";

export const serialize = (
  data: Seriall.Serializable,
  transformers: Seriall.Transformer[],
) => {
  const graph: Seriall.Serialized.Graph = [];
  const seen = new Map<any, number>();

  const addNodeToGraph = (node: Seriall.Serializable): number => {
    let id = seen.get(node);

    // ignore id if node is -0, because seen.get(-0) is same as seen.get(0), which thus loses its identity
    if (id !== undefined && !Object.is(node, -0)) {
      return id;
    }

    id = graph.length;
    seen.set(node, id);

    if (isJsonPrimitive(node)) {
      const id = graph.length;
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
      graph.push([]);
      const arr = graph[id] as number[];
      for (const element of node) {
        const elementId = addNodeToGraph(element);
        arr.push(elementId);
      }
      return id;
    }

    if (typeof node === "object") {
      graph.push({});
      const obj = graph[id] as Object;
      for (const key in node) {
        const elementId = addNodeToGraph(node[key]);
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
