import { LIB, NO_TRANSFORM_DATA, PROTOCOL_VERSION } from "../const";
import type { Seriall } from "../types/Seriall";
import { isJsonPrimitive } from "../utils";

export const serialize = (
  data: Seriall.Serializable,
  transformers: Seriall.Transformer[],
) => {
  const graph: Seriall.Serialized.Graph = [];
  const seen = new Map<any, number>();

  const addNodeToGraph = (node: Seriall.Serializable): number => {
    if (isJsonPrimitive(node)) {
      const id = graph.length;
      graph.push(node);
      return id;
    }

    let id = seen.get(node);

    if (id !== undefined) {
      return id;
    }

    id = graph.length;
    seen.set(node, id);

    const transformer = transformers.find((transformer) =>
      transformer.match(node),
    );

    if (transformer) {
      graph.push({ $: transformer.id });
      const revivable = graph[id] as Seriall.Serialized.RevivableNode;
      const encoded = transformer.encode(node);
      if (encoded !== NO_TRANSFORM_DATA) {
        const dataId = addNodeToGraph(encoded);
        revivable.d = dataId;
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
