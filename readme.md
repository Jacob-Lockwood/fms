# FMS

CST is (basically) done

the following document is informal language design notes.
I will write a real readme when I have the interpreter working.

golflang similar to golfscript, but infix.
main inspirations GS and Japt

```
~op = {U op V}
~pf = {U pf}
```

```
1 + + + + 2
1 +U+U+U+ 2
```

```
"Hello" + X

```

Primality test (8)

```
,1/~*^2%
```

FizzBuzz (30):

```
1,L%{%3!*"Fizz"+%5!*"Buzz"|}*N
```

Esolang commenter (36):

```
S=/'|;%{' *Z++' *(S*""sz+1-Z+=sz)+V}
```

Swap every two (9)

```
%2%~rv*[]
```

Quine (11)

```
"%u%%X"%X
# alternatives:
"-Xjs"-Xjs
="=%u;%%";%
=";js-'=+";js-'=+
("-34ch-'()*2"-34ch-'()*2
```

Custom functions:

```
ADD_TWO = {+2}
5 ~ADD_TWO
# multiple args
SUM = {U + V + W + UU + UV + UW + VU + …}
SUM = {N / ~+}
```

Built-ins:

<!-- prettier-ignore-start -->
| NAME  | DESCRIPTION                            |
|-------|----------------------------------------|
| U     | first argument                         |
| V     | second argument                        |
| W     | third argument                         |
| N     | argument list                          |
| +     | add / append                           |
| -     | subtract / prepend                     |
| \*    | multiply / join / repeat / group by    |
| /     | divide / split / fold / n equal chunks |
| \`    | filter                                 |
| \\    | reduced fraction pair                  |
| ^     | power / a in b? / sort by              |
| %     | mod / map / chunks of size n           |
| <> eq | comparison                             |
| & \|  | and / or                               |
| rv    | reverse                                |
| ch    | chr / ord                              |
| uq    | uniquify                               |
| I     | identity                               |
| ty    | type “a” “s” “c” “n” “f”               |
| ta    | coerce to array                        |
| ts    | coerce to string                       |
| tn    | coerce to number                       |
| tc    | coerce to character                    |
| tf    | coerce to function                     |
| tr    | transliterate                          |
| js    | json stringify                         |
| jp    | json parse                             |
| !     | not                                    |
| sz    | size (length)                          |
| p     | print                                  |
| ,     | range [a, b)                           |
| .     | pair [a, b]                            |
| N     | newline                                |
| L     | 100                                    |
| S     | space                                  |
| X     | last value                             |
| Z     | zero                                   |

<!-- prettier-ignore-end -->

```

1.2.3`{%2}

```

Parsing:

the expressions are made of “terms” separated by “+” or “-“ or “|” or “&” or "eq" or “<“ or “>” or “?” with the next separator being “:”

terms are made of primaries, separated by infix operators, followed by 0 or more postfix ops.

primaries are literals, parenthesized expressions, variable references, and assignments. if no valid primary is read, the implicit primary is U

EBNF grammar:

```
program = expression, { ";", [ expression ] };
expression = term, { (term separator, term) | ("?", term, ":", term) };
term = primary, { postfix operator | (binary operator, primary) };
primary = [ assignment | variable reference | parenthesized | literal ];
assignment = variable name, [ non variable ], "=", expression;
```

check if a word is a function or variable by checking if it’s either in the list of built-ins or if there is a ~
