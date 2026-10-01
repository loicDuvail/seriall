import type { Seriall } from "../types";
import { isSpecialNumber } from "./number.utils";

export const isJsonPrimitive = (
  value: Seriall.Serializable,
): value is Seriall.JsonPrimitive => {
  if (typeof value === "number") {
    return !isSpecialNumber(value);
  }
  return typeof value === "string" || typeof value === "boolean";
};
