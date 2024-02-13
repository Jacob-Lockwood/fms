// deno-lint-ignore no-explicit-any -- cond must be any for assertion functions
export function assert(cond: any, message = "Assertion failed"): asserts cond {
  if (!cond) throw new Error(message);
}
export type Tuple = [unknown, ...unknown[]];
