import { lex, type Token } from "../lexer";
import { isFn } from "./normalize";

function assert(cond: any, message: string = "Assertion failed"): asserts cond {
  if (!cond) throw new Error(message);
}

function or<T extends any[]>(
  rules: { [K in keyof T]: (tokens: Token[]) => T[K] },
  tokens: Token[],
): T[number] {
  for (const rule of rules) {
    try {
      return rule(tokens);
    } catch (e) {
      assert(e instanceof Error && e.message.startsWith("not"));
    }
  }
  throw new Error("No rule was matched");
}
function many(rule: (tokens: Token[]) => Node, tokens: Token[]) {
  const out: Node[] = [];
  while (true) {
    try {
      out.push(rule(tokens));
    } catch (e) {
      // console.log(e);
      break;
    }
  }
  return out;
}

export function parse(tokens: Token[]) {
  return many(statement, tokens);
}

type Node =
  | {
      kind: "fnDefinition";
      name: string;
      args: string[];
      body: Node;
    }
  | { kind: "assignment"; name: string; op: string | null; value: Node }
  | { kind: "binary op"; op: string; left: Node; right: Node }
  | { kind: "int"; value: string }
  | { kind: "str"; value: string }
  | { kind: "list"; items: Node[] }
  | { kind: "lambda"; body: Node[] }
  | { kind: "fnCall"; name: string; args: Node[] }
  | { kind: "varRef"; name: string };

function statement(tokens: Token[]) {
  // console.log("statement", JSON.stringify(tokens));
  return or([fnDefinition, expression], tokens);
  // return or([fnDefinition, expression])
}

function fnDefinition(tokens: Token[]): Node {
  const fnKeyword = tokens[0];
  assert(
    fnKeyword?.kind === "word" && fnKeyword?.text === "fn",
    "not fnDefinition",
  );
  tokens.shift();
  const name = tokens.shift();
  assert(name?.kind === "word", "fn definition must have a name");
  assert(
    tokens.shift()?.kind === "open paren",
    "fn definition must have parameter list",
  );

  const args: string[] = [];
  while (tokens[0]?.kind === "word") {
    const arg = tokens.shift()!;
    assert(
      !isFn(arg.text),
      "An identifier cannot be have the name of a function.",
    );
    args.push(arg.text);
  }
  assert(
    tokens.shift()?.kind === "close paren",
    "fn definition's parameter list must have ')'",
  );
  const body = lambda(tokens);
  return { kind: "fnDefinition", name: name.text, args, body };
}

// function assignment(tokens: Token[]): Node {
//   if (tokens[0]?.kind === "word") {
//     if (tokens[1]?.kind === "colon") {
//       const name = tokens.shift()!.text;
//       tokens.shift();
//       const value = expression(tokens);
//       return { kind: "assignment", name, op: null, value };
//     } else if (tokens[1]?.kind === "binary op" && tokens[2]?.kind === "colon") {
//       const name = tokens.shift()!.text;
//       const op = tokens.shift()!.text;
//       tokens.shift();
//       const value = expression(tokens);
//       return { kind: "assignment", name, op, value };
//     }
//   }
//   return expression(tokens);
// }

/*

1 + 2 * 3 - 2 * x

+- move 2 left
/* move 1 left

(- (+ 1 (* 2 3)) (* 2 x))

1 +
(+ 1 2 *
(+ 1 (* 2 3 -
(- (+ 1 (* 2 3)) 2 *
(- (+ 1 (* 2 3)) (* 2 x))

*/

const precedence = {
  "|": 1,
  "&": 1,
  "<": 2,
  "=": 2,
  ">": 2,
  "+": 3,
  "-": 3,
  "*": 4,
  "/": 4,
  "%": 4,
  "^": 5,
};

// using Shunting-yard algorithm
function expression(tokens: Token[]): Node {
  const items: (Node | keyof typeof precedence | "(" | ")")[] = [];
  let depth = 0;
  while (tokens[0] && tokens[0].kind !== "close curly") {
    if (tokens[0].kind === "open paren") {
      if (
        items.at(-1) &&
        (typeof items.at(-1) !== "string" || items.at(-1) === ")")
      )
        break;
      depth++;
      items.push(tokens.shift()!.text as "(");
    } else if (tokens[0].kind === "close paren") {
      depth--;
      // assert(depth !== -1, "not expression");
      if (depth === -1) break;
      items.push(tokens.shift()!.text as ")");
    } else if (tokens[0].kind === "binary op") {
      items.push(tokens.shift()!.text as keyof typeof precedence);
    } else {
      if (
        items.at(-1) &&
        (typeof items.at(-1) !== "string" || items.at(-1) === ")")
      )
        break;
      items.push(primary(tokens));
    }
  }
  assert(items.length);
  // console.log("items", items);
  const operands: Node[] = [];
  const operators: (keyof typeof precedence | "(")[] = [];
  function opOut() {
    const op = operators.pop()!;
    const right = operands.pop()!;
    const left = operands.pop()!;
    operands.push({ kind: "binary op", op, left, right });
  }
  for (const item of items) {
    if (item === "(") {
      operators.push(item);
    } else if (item === ")") {
      while (operators.at(-1) !== "(") {
        assert(operators.length !== 0, "Unbalanced parentheses");
        opOut();
      }
      operators.pop();
    } else if (typeof item === "string") {
      let o;
      while (
        (o = operators.at(-1)) &&
        o !== "(" &&
        precedence[o] >= precedence[item]
      ) {
        opOut();
      }
      operators.push(item);
    } else {
      operands.push(item);
    }
  }
  while (operators.length) opOut();
  return operands[0]!;
}

function primary(tokens: Token[]) {
  return or([fnCall, varRef, literal], tokens);
}

function literal(tokens: Token[]) {
  return or([int, str, list, lambda], tokens);
}

function int(tokens: Token[]): Node {
  assert(tokens[0]?.kind === "number", "not int");
  return { kind: "int", value: tokens.shift()!.text };
}

function str(tokens: Token[]): Node {
  assert(tokens[0]?.kind === "string", "not str");
  return { kind: "str", value: tokens.shift()!.text };
}

function list(tokens: Token[]): Node {
  assert(tokens[0]?.kind === "open square", "not list");
  tokens.shift();
  const items: Node[] = [];
  while ((tokens[0] as Token)?.kind !== "close square") {
    items.push(expression(tokens));
  }
  tokens.shift();
  return { kind: "list", items };
}

function lambda(tokens: Token[]): Node {
  assert(tokens[0]?.kind === "open curly", "not lambda");
  tokens.shift();
  const body = many(expression, tokens);
  // while ((tokens[0] as Token)?.kind !== "close curly") {
  //   body.push(expression(tokens));
  // }
  tokens.shift();
  return { kind: "lambda", body };
}
function fnCall(tokens: Token[]): Node {
  const name = tokens[0];
  assert(name?.kind === "word", "not fnCall");
  if (tokens[1]?.kind === "tilde") {
    assert(!isFn(name.text) && tokens[2]?.kind === "open paren", "not fnCall");
    tokens.splice(0, 3);
  } else {
    assert(isFn(name.text) && tokens[1]?.kind === "open paren", "not fnCall");
    tokens.splice(0, 2);
  }
  const args = many(expression, tokens);
  // while ((tokens[0] as Token)?.kind !== "close paren") {
  //   args.push(expression(tokens));
  // }
  tokens.shift();
  return { kind: "fnCall", name: name.text, args };
}
function varRef(tokens: Token[]): Node {
  assert(tokens[0]?.kind === "word", "not varRef");
  if (isFn(tokens[0].text)) {
    assert(tokens[1]?.kind === "tilde", "not varRef");
    const name = tokens.shift()!.text;
    tokens.shift();
    return { kind: "varRef", name };
  }
  assert(tokens[1]?.kind !== "tilde", "not varRef");
  return { kind: "varRef", name: tokens.shift()!.text };
}

const out = (n: Node): string =>
  n.kind === "binary op"
    ? `(${n.op} ${out(n.left)} ${out(n.right)})`
    : n.kind === "str" || n.kind === "int"
    ? n.value + ""
    : n.kind === "fnCall"
    ? `(${n.name} ${n.args.map(out).join(" ")})`
    : n.kind === "varRef"
    ? n.name
    : n.kind === "lambda"
    ? "{ " + n.body.map(out).join(" ") + " }"
    : JSON.stringify(n);

console.log(out(expression([...lex("1 - f~({ a + 2 * 3})")])));

// TODO!
// - character literals
// - assignment
// - $ literals
// - implicits (hopefully not hard, just add {nothing} to primary)
