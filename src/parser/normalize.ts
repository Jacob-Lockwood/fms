import type { Token } from "../lexer";
import { Peekable } from "../util/peekable";

const fns = { len: 1, rev: 1 };

//+ todo differentiate functions and variables
export function isFn(word: string): word is keyof typeof fns {
  return word in fns;
}

export function* balanceParens(tokens: Peekable<Token>): Generator<Token> {
  let depth = 0;
  for (const tok of tokens) {
    if (!tok) return;
    if (tok.kind === "semicolon") {
      for (depth; depth > 0; depth--) {
        yield { kind: "close paren", text: ")" };
      }
      continue;
    }
    yield tok;
    if (tok.kind === "word") {
      let fn = isFn(tok.text);
      if (tokens.peek.value?.kind === "tilde") {
        fn = !fn;
        yield tokens.next().value!;
      }
      if (fn && tokens.peek.value?.kind !== "open paren") {
        depth++;
        yield { kind: "open paren", text: "(" };
      }
    } else if (tok.kind === "open paren") {
      depth++;
    } else if (tok.kind === "close paren") {
      depth--;
    } else if (tok.kind === "open curly") {
      yield* balanceParens(tokens);
    } else if (tok.kind === "close curly") {
      for (depth; depth > 0; depth--) {
        yield { kind: "close paren", text: ")" };
      }
      return;
    }
    if (depth < 0) return;
  }
  for (depth; depth > 0; depth--) {
    yield { kind: "close paren", text: ")" };
  }
}
