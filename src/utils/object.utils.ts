import type { DeepOptional } from "../types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

export const deepMerge = <T extends Record<string, unknown>>(
  ...objects: DeepOptional<T>[]
): T => {
  const result: Record<string, unknown> = {};

  for (const obj of objects) {
    if (!isPlainObject(obj)) continue;

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        result[key] = structuredClone(value);
      } else if (isPlainObject(value)) {
        const existing = result[key];

        result[key] = deepMerge(isPlainObject(existing) ? existing : {}, value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
};
