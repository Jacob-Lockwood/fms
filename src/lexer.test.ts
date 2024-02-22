import {
  assert,
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { lex, type Token } from "./lexer.ts";

function assertProgramLexesTo(
  program: string,
  expected: { kind: Token["kind"]; image?: string }[]
) {
  const lexed = lex(program);
  assert(lexed.length === expected.length);
  for (let i = 0; i < expected.length; i++) {
    const expectedTok = expected[i];
    const actualTok = lexed[i];
    assertObjectMatch(actualTok, expectedTok);
  }
}

Deno.test("Lexing of number literals", () => {
  const lexed = lex("123 456 1_ 1_2_3");
  assertEquals(lexed.length, 6);
  for (const tok of lexed) assert(tok.kind === "number");
});

Deno.test("Lexing of plain string literals", () => {
  assertProgramLexesTo(`"123" "33..\\"a"`, [
    { kind: "string" },
    { kind: "string" },
  ]);
});

Deno.test("Lexing of interpolated string literals", () => {
  assertProgramLexesTo(`"abc\\Defg$1*(2+3)$"`, [
    { kind: "stringStart" },
    { kind: "number" },
    { kind: "binaryOperatorName" },
    { kind: "openParen" },
    { kind: "number" },
    { kind: "binaryOperatorName" },
    { kind: "number" },
    { kind: "closeParen" },
    { kind: "stringEnd" },
  ]);
});
