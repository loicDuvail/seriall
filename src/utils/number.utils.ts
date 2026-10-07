import type { Seriall } from "@types";

export const isSpecialNumber = (value: Seriall.Serializable): boolean => {
  return (
    value === Infinity ||
    value === -Infinity ||
    Number.isNaN(value) ||
    Object.is(value, -0)
  );
};

export const encodeSpecialNumber = (value: number): [0 | 1 | 2 | 3] => {
  if (Number.isNaN(value)) return [0];
  if (value === Infinity) return [1];
  if (value === -Infinity) return [2];
  if (Object.is(value, -0)) return [3];

  throw new Error(value + " is not a special number");
};

export const decodeSpecialNumber = ([value]: [0 | 1 | 2 | 3]) => {
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

export const encodeFlags = (...flags: boolean[]) => {
  let encoded = 0;
  for (let i = 0; i < flags.length; i++) {
    encoded += (flags[i] ? 1 : 0) * 2 ** i;
  }
  return encoded;
};

export const decodeFlags = (encoded: number, flagsCount: number) => {
  if (flagsCount > 32) throw new Error("Can't have more than 32 flags");
  const flags: boolean[] = [];
  for (let i = 0; i < flagsCount; i++) {
    flags[i] = ((encoded >> i) & 1) === 1;
  }
  return flags;
};
