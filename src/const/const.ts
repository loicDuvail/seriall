import type { Seriall } from "../types/Seriall";

export const SIGNATURE_INDEX = 0 as const;
export const DATA_INDEX = 1 as const;

export const NO_TRANSFORM_DATA: Seriall.Transformer.NoData = undefined;

export const PROTOCOL_VERSION: Seriall.MetaData["v"] = 1;
export const LIB: Seriall.MetaData["lib"] = "seriall";

export const PRIORITY = {
  CUSTOM_CLASS: 0,
  NATIVE_CLASS: 1,
  PRIMITIVE: 2,
  custom: (priority: number) =>
    (priority <= 0 ? 1 : priority) + PRIORITY.CUSTOM_CLASS,
} as const;
