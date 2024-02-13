import type { Token } from "../lexer.ts";
import { assert, type Tuple } from "../util.ts";

type Optional<T> = [] | [T];
type NonVariable = Token<"binaryOperatorName" | "postfixOperatorName">;

export type CSTNode =
  | {
      kind: "program";
      children: [
        CSTNode & { kind: "expression" },
        [Token<"semicolon">, Optional<CSTNode & { kind: "expression" }>][]
      ];
    }
  | {
      kind: "expression";
      children: [
        CSTNode & { kind: "term" },
        (
          | (CSTNode & { kind: "ternary" })
          | [CSTNode & { kind: "termSeparator" }, CSTNode & { kind: "term" }]
        )[]
      ];
    }
  | {
      kind: "termSeparator" | "binaryOperator";
      children: [Token<"binaryOperatorName">];
    }
  | {
      kind: "term";
      children: [
        CSTNode,
        (
          | Token<"postfixOperatorName">
          | [CSTNode & { kind: "binaryOperator" }, CSTNode]
        )[]
      ];
    }
  | {
      kind: "ternary";
      children: [
        Token<"questionMark">,
        CSTNode & { kind: "term" },
        Token<"colon">,
        CSTNode & { kind: "term" }
      ];
    }
  | {
      kind: "assignment";
      children: [
        Token<"variableName">,
        Optional<NonVariable>,
        Token<"equal">,
        CSTNode & { kind: "expression" }
      ];
    }
  | {
      kind: "variableReference";
      children: [Token<"variableName"> | [Token<"tilde">, NonVariable]];
    }
  | {
      kind: "parenthesized";
      children: [
        Token<"openParen">,
        CSTNode & { kind: "expression" },
        Token<"closeParen">
      ];
    }
  | { kind: "stringLiteral"; children: [Token<"string">] }
  | { kind: "numberLiteral"; children: [Token<"number">] }
  | { kind: "characterLiteral"; children: [Token<"character">] }
  | {
      kind: "functionLiteral";
      children: [
        Token<"openCurly">,
        CSTNode & { kind: "program" },
        Token<"closeCurly">
      ];
    }
  | { kind: "implicit" };

export class CSTBuilder {
  constructor(private tokens: Token[]) {}
  call<T>(rule: () => T) {
    const backup = this.tokens.slice();
    try {
      return rule.call(this);
    } catch (e) {
      this.tokens = backup;
      throw e;
    }
  }
  token<T extends Token["kind"]>(kind: T) {
    assert(this.tokens[0]?.kind === kind);
    return this.tokens.shift() as Token<T>;
  }
  many<T>(rule: () => T) {
    const out: T[] = [];
    while (this.tokens.length) {
      try {
        out.push(this.call(rule));
      } catch (_) {
        break;
      }
    }
    return out;
  }
  optional<T>(rule: () => T): Optional<T> {
    try {
      return [this.call(rule)];
    } catch (_) {
      return [];
    }
  }
  // deno-lint-ignore no-explicit-any -- can't find a better way to write this
  or<const T extends (() => any)[]>(rules: T): ReturnType<T[number]> {
    for (const rule of rules) {
      try {
        return this.call(rule);
      } catch (_) {
        continue;
      }
    }
    throw new Error("no rule matched");
  }

  program(): CSTNode & { kind: "program" } {
    return {
      kind: "program",
      children: [
        this.expression(),
        this.many(() => [
          this.token("semicolon"),
          this.optional(this.expression),
        ]),
      ],
    };
  }
  expression(): CSTNode & { kind: "expression" } {
    return {
      kind: "expression",
      children: [
        this.term(),
        this.many(() =>
          this.or([
            () => [this.termSeparator(), this.term()] satisfies Tuple,
            this.ternary,
          ])
        ),
      ],
    };
  }
  ternary(): CSTNode & { kind: "ternary" } {
    return {
      kind: "ternary",
      children: [
        this.token("questionMark"),
        this.term(),
        this.token("colon"),
        this.term(),
      ],
    };
  }
  term(): CSTNode & { kind: "term" } {
    return {
      kind: "term",
      children: [
        this.primary(),
        this.many(() =>
          this.or([
            () => this.token("postfixOperatorName"),
            () => [this.binaryOperator(), this.primary()] satisfies Tuple,
          ])
        ),
      ],
    };
  }
  termSeparator(): CSTNode & { kind: "termSeparator" } {
    const name = this.token("binaryOperatorName");
    assert("+-|&<> eq".includes(name.image));
    return { kind: "termSeparator", children: [name] };
  }
  binaryOperator(): CSTNode & { kind: "binaryOperator" } {
    const name = this.token("binaryOperatorName");
    assert(!"+-|&<> eq".includes(name.image));
    return { kind: "binaryOperator", children: [name] };
  }
  primary(): CSTNode {
    return this.or([
      this.assignment,
      this.variableReference,
      this.parenthesized,
      this.literal,
      () => ({ kind: "implicit" } as const),
    ]);
  }
  assignment(): CSTNode & { kind: "assignment" } {
    return {
      kind: "assignment",
      children: [
        this.token("variableName"),
        this.optional(this.nonVariable),
        this.token("equal"),
        this.expression(),
      ],
    };
  }
  variableReference(): CSTNode & { kind: "variableReference" } {
    return {
      kind: "variableReference",
      children: [
        this.or([
          () => this.token("variableName"),
          () => [this.token("tilde"), this.nonVariable()] satisfies Tuple,
        ]),
      ],
    };
  }
  parenthesized(): CSTNode & { kind: "parenthesized" } {
    return {
      kind: "parenthesized",
      children: [
        this.token("openParen"),
        this.expression(),
        this.token("closeParen"),
      ],
    };
  }
  literal() {
    return this.or([
      this.stringLiteral,
      this.numberLiteral,
      this.characterLiteral,
      this.functionLiteral,
    ]);
  }
  stringLiteral(): CSTNode & { kind: "stringLiteral" } {
    return { kind: "stringLiteral", children: [this.token("string")] };
  }
  numberLiteral(): CSTNode & { kind: "numberLiteral" } {
    return { kind: "numberLiteral", children: [this.token("number")] };
  }
  characterLiteral(): CSTNode & { kind: "characterLiteral" } {
    return { kind: "characterLiteral", children: [this.token("character")] };
  }
  functionLiteral(): CSTNode & { kind: "functionLiteral" } {
    return {
      kind: "functionLiteral",
      children: [
        this.token("openCurly"),
        this.program(),
        this.token("closeCurly"),
      ],
    };
  }

  nonVariable(): NonVariable {
    return this.or([
      () => this.token("binaryOperatorName"),
      () => this.token("postfixOperatorName"),
    ]);
  }
}
