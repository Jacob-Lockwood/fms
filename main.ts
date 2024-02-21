import { lex } from "./src/lexer.ts";
import { Parser } from "./src/parser.ts";

const pgm = (code: string) => {
  const parser = new Parser(lex(code));
  const program = parser.program();
  console.log(JSON.stringify(program, null, 2) + "\n");
  const cst = parser.cst;
  console.log(JSON.stringify(cst, ["name", "children", "image"], 2) + "\n");
};

pgm(`O=/'|;%{S*Z++S*(O*""sz+1-Z+=sz)+V}`);
// pgm(`S*Z++S*(O*""sz+1-Z+=sz)+V`);
