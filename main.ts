import { lex } from "./src/lexer.ts";
import { CSTBuilder } from "./src/parser/cst.ts";

const code = `S=/'|;%{' *Z++' *(S*""sz+1-Z+=sz)+V}`;
const tokens = lex(code);
const parsed = new CSTBuilder(tokens).program();
// console.log(parsed);
console.log(JSON.stringify(parsed, ["kind", "children"], 2));
