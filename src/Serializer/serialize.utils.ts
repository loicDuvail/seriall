import { signatureKey, signatureValue } from "./serialize.const";
import type { Seriall } from "../types";

export const isPrimitive = (
  value: Seriall.Serializable,
): value is Seriall.Primitive => {
  if (typeof value === "number") {
    return !isSpecialNumber(value);
  }
  return typeof value === "string" || typeof value === "boolean";
};

export const isSymbol = (value: Seriall.Serializable): value is Symbol => {
  return typeof value === "symbol";
};

export const isUndefined = (value: Seriall.Serializable): value is undefined =>
  value === undefined;

export const isNull = (value: Seriall.Serializable): value is null =>
  value === null;

export const isBigInt = (value: Seriall.Serializable): value is bigint =>
  typeof value === "bigint";

export const isSpecialNumber = (value: number): boolean => {
  return [Infinity, -Infinity, NaN].includes(value) || Object.is(value, -0);
};

export const isSerializedNative = <T extends Seriall.NativeRevivableType>(
  node: Seriall.Revivable<any>,
  type: T,
): node is Seriall.Revivable<T> => {
  return node.type === type;
};

export const encodeSpecialNumber = (value: number) => {
  if (Number.isNaN(value)) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";
  if (Object.is(value, -0)) return "-0";

  throw new Error(value + " is not a special number");
};

export const decodeSpecialNumber = (value: string) => {
  switch (value) {
    case "NaN":
      return NaN;
    case "Infinity":
      return Infinity;
    case "-Infinity":
      return -Infinity;
    case "-0":
      return -0;
    default:
      throw new Error(value + " is not a special number");
  }
};

export const isSigned = (
  value: Seriall.SerializedNode,
): value is Seriall.Revivable<any> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  signatureKey in value &&
  value[signatureKey] === signatureValue;
