import type { DeepOptional } from "../types";

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
