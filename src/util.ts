// deno-lint-ignore no-explicit-any -- cond must be any for assertion functions
export function assert(cond: any, message = "Assertion failed"): asserts cond {
  if (!cond) throw new Error(message);
}
// use [1, 2, 3] satisfies Tuple instead of [1, 2, 3] as [1, 2, 3]
export type Tuple = [unknown, ...unknown[]];
