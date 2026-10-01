import type { Seriall } from "../types/Seriall";

export const SIGNATURE_KEY: Extract<
  keyof Seriall.Serialized.RevivableNode,
  "$"
> = "$";
export const DATA_KEY: Extract<keyof Seriall.Serialized.RevivableNode, "d"> =
  "d";
export const NO_TRANSFORM_DATA: Seriall.Transformer.NoData = undefined;

export const PRIORITY = {
  CUSTOM_CLASS: 0,
  NATIVE_CLASS: 1,
  PRIMITIVE: 2,
  custom: (priority: number) =>
    (priority <= 0 ? 1 : priority) + PRIORITY.CUSTOM_CLASS,
} as const;
