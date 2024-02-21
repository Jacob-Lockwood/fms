import { assert } from "./util.ts";

const tokens = {
  string: /"([^"]|\\")*"/y,
  number: /\d+_?/y,
  character: /'./y,
  openParen: /\(/y,
  closeParen: /\)/y,
  openCurly: /{/y,
  closeCurly: /}/y,
  openSquare: /\[/y,
  closeSquare: /\]/y,
  equal: /=/y,
  tilde: /~/y,
  semicolon: /;/y,
  colon: /:/y,
  questionMark: /\?/y,
  variableName: /[A-Z_]+/y,
  binaryOperatorName: /[@$%^&*\-+|,./<>`\\]|eq|neq/y,
  postfixOperatorName: /[a-z]{2}|!/y,
} satisfies Record<string, RegExp>;

export type Token<T extends keyof typeof tokens = keyof typeof tokens> = {
  kind: T;
  image: string;
  startIndex: number;
  endIndex: number;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
};

const ignores = {
  whitespace: /\s+/y,
  comment: /#.*$/my,
} satisfies Record<string, RegExp>;

for (const obj of [tokens, ignores])
  assert(Object.values(obj).every((re) => re.sticky));

export function lex(code: string) {
  const out: Token[] = [];
  let index = 0;
  let line = 0;
  let column = 0;
  loop: while (index < code.length) {
    for (const key in tokens) {
      const kind = key as keyof typeof tokens;
      const regex = tokens[kind];
      const execResult = regex.exec(code.slice(index));
      if (!execResult) continue;
      const match = execResult[0];
      out.push({
        kind,
        image: match,
        startIndex: index,
        endIndex: (index += regex.lastIndex),
        startLine: line,
        endLine: (line += match.split("\n").length - 1),
        startColumn: column,
        endColumn: (column = match.includes("\n")
          ? match.split("\n").at(-1)!.length
          : column + match.length),
      });
      regex.lastIndex = 0;
      continue loop;
    }
    for (const ignore of Object.values(ignores)) {
      const execResult = ignore.exec(code.slice(index));
      if (!execResult) continue;
      const match = execResult[0];
      column = match.includes("\n")
        ? match.split("\n").at(-1)!.length
        : column + match.length;
      line += match.split("\n").length - 1;
      index += ignore.lastIndex;
      ignore.lastIndex = 0;
      continue loop;
    }
    throw new SyntaxError("Unexpected token: " + code.slice(index));
  }
  return out;
}
