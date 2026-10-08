import type { Seriall } from "@types";

type LimitErrorType = "depth" | "nodes" | "payload";

export class LimitError extends Error {
  message: string;
  constructor({
    limits,
    current,
    type,
  }: {
    limits: Seriall.Options["limits"];
    current?: number;
    type: LimitErrorType;
  }) {
    super();
    switch (type) {
      case "depth":
        this.message = `Max depth exceeded. Authorized max depth: ${limits.maxDepth}`;
        break;
      case "nodes":
        this.message = `Too many nodes, max nodes: ${limits.maxNodes}, received nodes: ${current}`;
        break;
      case "payload":
        this.message = `Payload is too big, max payload: ${limits.maxPayloadSize}, received payload: ${current}`;
        break;
    }
    return;
  }
}
