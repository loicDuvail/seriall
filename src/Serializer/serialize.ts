import { signature, defaultEncoder } from "./serialize.const";
import {
  isPrimitive,
  isSymbol,
  isUndefined,
  isNull,
  isSpecialNumber,
  encodeSpecialNumber,
  isBigInt,
} from "./serialize.utils";
import type { Cereal } from "../types";

const normalize =
  (codecs: Record<string, Cereal.ClassCodec<new (...args: any) => any, any>>) =>
  (
    data: Cereal.Serializable,
    graph: Cereal.SerializedGraph,
    seen: Map<Exclude<Cereal.Serializable, Cereal.Primitive>, number>,
  ): number => {
    if (isPrimitive(data)) {
      const id = graph.length;
      graph.push(data);
      return id;
    }

    let id = seen.get(data);

    if (id !== undefined) {
      return id;
    }

    id = graph.length;
    seen.set(data, id);

    if (isSymbol(data)) {
      graph.push(undefined as never);
      const serialized: Cereal.Revivable<"$__symbol"> = {
        ...signature,
        type: "$__symbol",
        value: normalize(codecs)(data.description, graph, seen),
      };
      graph[id] = serialized;
      return id;
    }

    if (isUndefined(data)) {
      const serialized: Cereal.Revivable<"$__undefined"> = {
        ...signature,
        type: "$__undefined",
      };
      graph.push(serialized);
      return id;
    }

    if (isNull(data)) {
      const serialized: Cereal.Revivable<"$__null"> = {
        ...signature,
        type: "$__null",
      };

      graph.push(serialized);
      return id;
    }

    if (typeof data === "number" && isSpecialNumber(data)) {
      graph.push(undefined as never);

      const serialized: Cereal.Revivable<"$__special_number"> = {
        ...signature,
        type: "$__special_number",
        value: normalize(codecs)(encodeSpecialNumber(data), graph, seen),
      };

      graph[id] = serialized;
      return id;
    }

    if (isBigInt(data)) {
      graph.push(undefined as never);

      const serialized: Cereal.Revivable<"$__bigint"> = {
        ...signature,
        type: "$__bigint",
        value: normalize(codecs)(data.toString(), graph, seen),
      };

      graph[id] = serialized;
      return id;
    }

    if (Array.isArray(data)) {
      graph.push([]);

      const arr = graph[id] as number[];

      for (const item of data) {
        arr.push(normalize(codecs)(item, graph, seen));
      }

      return id;
    }

    let [className, { encode }] = Object.entries(codecs).find(
      ([_, { clazz }]) => data instanceof clazz,
    ) || [undefined, {}];

    encode ||= defaultEncoder;

    if (!className) {
      graph.push({});

      const obj = graph[id] as Record<string, number>;
      const source = data as Record<string, any>;

      for (const key in data) {
        obj[key] = normalize(codecs)(source[key], graph, seen);
      }

      return id;
    }

    graph.push(undefined as never);

    const serialized: Cereal.Revivable<Cereal.ClassName> = {
      ...signature,
      type: className,
      value: normalize(codecs)(encode(data), graph, seen),
    };

    graph[id] = serialized;

    return id;
  };

export const serialize =
  (codecs: Record<string, Cereal.ClassCodec<new (...args: any) => any, any>>) =>
  (data: Cereal.Serializable): string => {
    const graph: Cereal.SerializedGraph = [];
    const memory = new Map<
      Exclude<Cereal.Serializable, Cereal.Primitive>,
      number
    >();
    normalize(codecs)(data, graph, memory);
    return JSON.stringify(graph);
  };
