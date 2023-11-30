# YAK

This is a new programming language I'm working on (yes, I've started many of
these and not finished any but this time will be different...). It's designed to
be reasonably good at code-golf while still being usable for practical problems.
The interpreter will be written in TypeScript, but so far I'm still working on
the parser.

The rest of this readme is my language design notes and nothing formal or
particularly final.

---

YAK

golflang similar to golfscript, but with way more elements of practical
languages

Infix is cool

Lazy evaluation! (kinda like Haskell)

Primality test (15)

```
{range1)/*~^2%}
```

or recursively (21):

```
f:{if%,|:-1f~.,-1,=1}
```

FizzBuzz (32):

```
{100*{%3!*"Fizz"+%5!*"Buzz"|}}
```

```
"Fizz" * !(. % 3) + "Buzz" * !(. % 5) | .
|(+(*("Fizz",!(%($,3))),*("Buzz",!(%($,5)))),$)
```

Esolang commenter (43):

```
{a:0;s:$1/?|)%{? *a++? *(1+len*"")-a+:len)+$2}}
```

Swap every two (12)

```
{%2%rev~*[]}
```

Quine (48)

```
puts a:"puts a:%s)%(b:chr34))+a+b")%(b:chr34))+a+b;
```

```
b:chr34;puts a:"b:chr34;puts a:%s)%(b+a+b))")%(b+a+b;
```

Custom functions:

```
fn add_two(arg) {arg + 2}
add_two 5

# contrast with

add_two : {. + 2}
add_two~ 5
```

Modules:

```
# math.yak

pi : 3.14159; fn rad(deg) {deg \* (pi / 180)}

# or pi / 180 \* deg

# main.yak

use math; math.rad .)+0.2
```

globals are automatically imported

Built-ins:

| name    | function                                              |
| ------- | ----------------------------------------------------- |
| `.`     | First lambda argument                                 |
| `,`     | Second lambda argument                                |
| `+`     | Add / concat / lambda compose                         |
| `-`     | Subtract / set diff                                   |
| `*`     | Multiply / join / n times / reduce by                 |
| `/`     | Divide / split / n equal chunks / partition by lambda |
| `^`     | Exponent                                              |
| `%`     | Mod / map / chunks of size n                          |
| `<=>`   | Comparison                                            |
| `&\|`   | And / Or                                              |
| `!`     | Not (postfix)                                         |
| `if`    | `if cond {then} [else]`                               |
| `len`   | length                                                |
| `rev`   | reverse                                               |
| `range` | [a, b)                                                |
| `n`     | Newline                                               |

Interpreter process:

1. Lex (implemented!)
2. Normalize parentheses: Insert after function name, at end of literal.
   implemented!
3. Parse to tree of operator / function calls and literals, with precedence
   established Parsing:
   - if token is open paren, recurse
   - if token is close paren, return
   - if token is literal, parse_literal
   - if token is binary op, { op, left: prev, right: next }

Runtime: Everything is lazy evaluated with Lazy<T> class. Operations just map
Lazy’s together.

```
a.map((a)=>b.map((b)=>a+b))
Lazy.all([a,b]).then(([a,b])=>a+b)
```

check if a word is a function or variable by checking if it’s either in the list
of built-ins or if there is an `fn` followed by the name.

Precedence climbing to convert operators to JS function calls. Everything left
associative

Parsing expressions by precedence climbing - Eli Bendersky's website

Infix Expression Parsing | reinterpretcast.com

```
{/(len)/2)%rev~*[]}
{ / ( len ) / 2 ) % rev~ * [ ] }
{ / ( len ( ) / 2) % rev~ * [ ] }
{ (%(/(it, /(len(it), 2)), rev), []) }
```
