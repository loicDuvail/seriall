export type DeepOptional<T> = {
  [K in keyof T]?: T[K] extends object ? DeepOptional<T[K]> : T[K];
};

export type AnyClass = new (...args: any[]) => any;
