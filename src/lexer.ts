const digits = "0123456789";
const word = /^[A-Za-z_]/;
const whitespace = /^\s/;
const binaryOps = "+-*/^%<>=!&|";

const symbolMap = {
  "{": "open curly",
  "}": "close curly",
  "[": "open square",
  "]": "close square",
  "(": "open paren",
  ")": "close paren",
  ";": "semicolon",
  "~": "tilde",
  ".": "dot",
  ",": "comma",
  ":": "colon",
} as const;

export function* lex(code: string) {
  let globalIdx = 0;
  /** Returns code sliced from 0 (inclusive) to n (exclusive).
   * If n is -1, read to the end of the code. */
  function readN(n: number) {
    if (n === -1) {
      // globalIdx += code.length - 1;
      const text = code;
      code = "";
      return text;
    }
    const text = code.slice(0, n);
    // globalIdx += n;
    code = code.slice(n);
    return text;
  }
  while (code[0]) {
    if (code[0] === "?") {
      yield { kind: "char", text: readN(2) } as const;
    } else if (code[0] === "$") {
      const idx = code
        .slice(1)
        .split("")
        .findIndex((char) => !digits.includes(char));
      yield {
        kind: "script arg",
        text: readN(idx) + 1,
      } as const;
    } else if (code[0] === '"') {
      const idx =
        code
          .slice(1)
          .split("")
          .findIndex((char, i) => char === '"' && code[i - 1] !== "\\") + 2;
      yield { kind: "string", text: readN(idx) } as const;
    } else if ((digits + "_").includes(code[0])) {
      let dotRead = false;
      const idx = code.split("").findIndex((char, i) => {
        if (char === "_" && i === 0) return false;
        if (digits.includes(char)) return false;
        if (char === ".") return !(dotRead = !dotRead);
        return true;
      });
      yield { kind: "number", text: readN(idx) } as const;
    } else if (code[0] in symbolMap) {
      const kind = symbolMap[code[0] as keyof typeof symbolMap];
      yield { kind, text: readN(1) } as const;
    } else if (binaryOps.includes(code[0])) {
      yield { kind: "binary op", text: readN(1) } as const;
    } else if (word.test(code[0])) {
      const idx = code.split("").findIndex((char) => !word.test(char));
      yield { kind: "word", text: readN(idx) } as const;
    } else if (whitespace.test(code[0])) {
      readN(code.split("").findIndex((char) => !whitespace.test(char)));
    } else {
      throw new Error("Error in lexing, remaining code is: " + code);
    }
  }
  // return { kind: "eof", text: "" } as const;
}

type TokenGenerator = ReturnType<typeof lex>;
export type Token = TokenGenerator extends Generator<infer T> ? T : never;
