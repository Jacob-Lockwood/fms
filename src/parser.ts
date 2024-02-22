import type { Token } from "./lexer.ts";
import { assert } from "./util.ts";

type CSTNode = Token | { name: string; children: CSTNode[] };

export class ASTNode<TName extends string = string, TChildren = unknown> {
  constructor(public name: TName, public children: TChildren) {}
}

export class Parser {
  constructor(private tokens: Token[]) {}
  cst: CSTNode[] = [];
  rule<TName extends string, TReturn>(name: TName, body: () => TReturn) {
    return () => {
      const len = this.cst.length;
      const result = this.call(body);
      this.cst.push({ name, children: this.cst.splice(len) });
      return new ASTNode(name, result);
    };
  }
  call<T>(rule: () => T) {
    const tokensBackup = this.tokens.slice();
    const cstBackup = this.cst.length;
    try {
      return rule.call(this);
    } catch (e) {
      this.tokens = tokensBackup;
      this.cst.splice(cstBackup);
      throw e;
    }
  }
  consume<T extends Token["kind"]>(kind: T) {
    assert(this.tokens[0]?.kind === kind);
    const tok = this.tokens.shift() as Token<T>;
    this.cst.push(tok);
    return tok;
  }
  many<T>(rule: () => T, atLeastOne = false) {
    const out = atLeastOne ? [this.call(rule)] : [];
    while (this.tokens.length) {
      try {
        out.push(this.call(rule));
      } catch (_) {
        break;
      }
    }
    return out;
  }
  manySeparated<T>(
    rule: () => T,
    separator: Token["kind"],
    atLeastOne = false
  ) {
    const out: T[] = [];
    if (atLeastOne) {
      out.push(this.call(rule));
      this.consume(separator);
    }
    while (this.tokens.length) {
      try {
        out.push(this.call(rule));
        this.consume(separator);
      } catch (_) {
        break;
      }
    }
    return out;
  }
  optional<T>(rule: () => T) {
    try {
      return this.call(rule);
    } catch (_) {
      return null;
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

  program = this.rule("program", () => {
    return this.manySeparated(this.expression, "semicolon");
  });
  expression = this.rule("expression", () => {
    // TODO refactor collection of nodes
    const first = this.primary();
    const firstPostfix = this.many(() => this.consume("postfixOperatorName"));
    const nodes = this.many(() => [
      this.consume("binaryOperatorName"),
      this.primary(),
      ...this.many(() => this.consume("postfixOperatorName")),
    ]).flat();
    nodes.unshift(first, ...firstPostfix);

    // TODO make this type specific.
    const operands: ASTNode[] = [];
    const operators: string[] = [];
    function buildBinaryOperatorNode() {
      const right = operands.shift()!;
      const left = operands.shift()!;
      const op = operators.shift()!;
      operands.unshift(new ASTNode("binaryOp", { op, left, right }));
    }
    function buildPostfixOperatorNode(op: string) {
      while (operatorPrecedence(operators[0]) >= 5) {
        buildBinaryOperatorNode();
      }
      const argument = operands.shift()!;
      operands.unshift(new ASTNode("postfixOp", { op, argument }));
    }
    for (const node of nodes) {
      if (node instanceof ASTNode) {
        operands.unshift(node);
        continue;
      } else if (node.kind === "binaryOperatorName") {
        while (
          operators[0] &&
          operatorPrecedence(operators[0]) >= operatorPrecedence(node.image)
        ) {
          buildBinaryOperatorNode();
        }
        operators.unshift(node.image);
      } else {
        buildPostfixOperatorNode(node.image);
      }
    }
    while (operators.length) buildBinaryOperatorNode();
    assert(operands.length === 1);
    return operands[0];
  });
  primary = () =>
    this.or([
      this.parenthesized,
      this.assignment,
      this.variableReference,
      this.literal,
      this.rule("implicit", () => {}),
    ]);
  parenthesized = this.rule("parenthesized", () => {
    this.consume("openParen");
    const expr = this.expression();
    this.consume("closeParen");
    return expr;
  });
  assignment = this.rule("assignment", () => {
    const name = this.consume("variableName").image;
    const modifier = this.optional(this.nonVariable);
    this.consume("equal");
    const value = this.expression();
    return { name, modifier, value };
  });
  variableReference = this.rule("variableReference", () => {
    return this.consume("variableName").image;
  });
  literal = () =>
    this.or([
      this.functionLiteral,
      this.arrayLiteral,
      this.numberLiteral,
      this.stringLiteral,
      this.interpolatedStringLiteral,
      this.characterLiteral,
    ]);
  functionLiteral = this.rule("functionLiteral", () => {
    this.consume("openCurly");
    const body = this.manySeparated(this.expression, "semicolon");
    this.consume("closeCurly");
    return body;
  });
  arrayLiteral = this.rule("arrayLiteral", () => {
    this.consume("openSquare");
    const values = this.manySeparated(this.expression, "semicolon");
    this.consume("closeSquare");
    return values;
  });
  numberLiteral = this.rule("numberLiteral", () => {
    return this.consume("number").image;
  });
  stringLiteral = this.rule("stringLiteral", () => {
    return this.consume("string").image.slice(1, -1);
  });
  interpolatedStringLiteral = this.rule("interpolatedStringLiteral", () => {
    const start = this.consume("stringStart").image.slice(1, -1);
    const parts = this.many(() => [
      this.expression(),
      this.consume("stringPart").image.slice(1, -1),
    ]).flat();
    const end = this.consume("stringEnd").image.slice(1, -1);
    parts.unshift(start);
    parts.push(end);
    return parts;
  });
  characterLiteral = this.rule("characterLiteral", () => {
    return this.consume("character").image.slice(1);
  });

  nonVariable = () =>
    this.or([
      () => this.consume("binaryOperatorName").image,
      () => this.consume("postfixOperatorName").image,
    ]);
}

function operatorPrecedence(operator: string): number {
  return (
    [
      [0, "| &"],
      [1, "b& b| b^ b> b<"],
      [2, "eq nq"],
      [3, "< >"],
      [4, "+ -"],
      [5, "* % / \\ ` ^ . @ $"],
      [6, ","],
    ] as const
  ).findIndex(([_idx, str]) => str.includes(operator));
}
