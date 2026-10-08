import { LIB, PROTOCOL_VERSION } from "@const";

type FormatErrorType = "library" | "version" | "payload" | "reference" | "json";

export class FormatError extends Error {
  message: string;

  constructor({ type, value }: { type: FormatErrorType; value: unknown }) {
    super();
    switch (type) {
      case "payload":
        this.message = `Invalid seriall payload: 'd' must be an array`;
        break;
      case "json":
        this.message = `Data is malformed JSON: "${new String(value).substring(30)}..."`;
        break;
      case "library":
        this.message = `Can't deserialize data, invalid lib metadata. Expected "${LIB}", got "${value}"`;
        break;
      case "reference":
        this.message = `Invalid serialized graph reference: ${value}`;
        break;
      case "version":
        this.message = `Can't deserialize data, invalid protocol version. Expected ${PROTOCOL_VERSION}, got ${value}`;
        break;
    }
  }
}
