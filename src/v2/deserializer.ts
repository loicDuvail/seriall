import type { Seriall } from "./types";
import { isJsonPrimitive } from "./utils";
import { DATA_KEY, SIGNATURE_KEY, NO_TRANSFORM_DATA } from "./const";

export const deserialize = (
  data: string,
  transformers: Map<Seriall.Transformer.Id, Seriall.Transformer<any, any>>,
) => {
  const graph: Seriall.Serialized.Graph = JSON.parse(data);
  const revived: Map<number, Seriall.Serializable> = new Map();

  const reviveNode = (index: number) => {
    if (revived.has(index)) {
      return revived.get(index);
    }

    const node = graph[index];

    if (isJsonPrimitive(node)) {
      revived.set(index, node);
      return node;
    }

    if (!Array.isArray(node) && typeof node === "object") {
      const transformerId = node[SIGNATURE_KEY];
      const dataId = node[DATA_KEY];
      const transformer = transformers.get(transformerId);

      revived.set(index, []);

      if (dataId) {
        const data = reviveNode(dataId);
        const decoded = transformer?.decode(data);
        revived.set(index, decoded);
      } else {
        const decoded = transformer?.decode(NO_TRANSFORM_DATA);
        revived.set(index, decoded);
      }

      return revived.get(index);
    }

    if (Array.isArray(node)) {
      const arr = [];
      revived.set(index, arr);
      for (const element of node) {
        arr.push(reviveNode(element));
      }
    }
  };

  return reviveNode(0);
};
