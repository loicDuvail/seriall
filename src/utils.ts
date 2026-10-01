import type { Seriall } from "./types";

export const isJsonPrimitive = (
  value: Seriall.Serializable,
): value is Seriall.JsonPrimitive => {
  if (typeof value === "number") {
    return !isSpecialNumber(value);
  }
  return typeof value === "string" || typeof value === "boolean";
};

export const isSpecialNumber = (value: number): boolean => {
  return [Infinity, -Infinity, NaN].includes(value) || Object.is(value, -0);
};

export const encodeSpecialNumber = (value: number) => {
  if (Number.isNaN(value)) return 0;
  if (value === Infinity) return 1;
  if (value === -Infinity) return 2;
  if (Object.is(value, -0)) return 3;

  throw new Error(value + " is not a special number");
};

export const decodeSpecialNumber = (value: 0 | 1 | 2 | 3) => {
  switch (value) {
    case 0:
      return NaN;
    case 1:
      return Infinity;
    case 2:
      return -Infinity;
    case 3:
      return -0;
    default:
      throw new Error(value + " is not a special number");
  }
};

export type Class = new (...args: any[]) => any;

export type DeepOptional<T> = {
  [K in keyof T]?: T[K] extends object ? DeepOptional<T[K]> : T[K];
};

export const deepMerge = <T extends Object>(
  ...objects: DeepOptional<T>[]
): T => {
  const result = {} as T;

  for (const obj of objects) {
    if (!obj || typeof obj !== "object") continue;

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const existing = result[key];

        result[key] = deepMerge(
          existing && typeof existing === "object" && !Array.isArray(existing)
            ? existing
            : {},
          value,
        );
      } else {
        // Clone arrays so the originals aren't referenced
        result[key] = Array.isArray(value) ? structuredClone(value) : value;
      }
    }
  }

  return result;
};
