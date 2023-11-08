# YAK

This is a new programming language I'm working on (yes, I've started many of
these and not finished any but this time will be different...). It's designed to
be (reasonably) good at code-golf while still fairly practical. To make sure I
keep it practical enough, I will be bootstrapping the compiler for this (the
compiler will target JavaScript). The rest of this readme is my language design
notes and nothing formal or particularly final.

---

golflang inspired by golfscript, but with way more elements of practical
languages. Infix and prefix

Primality test (17):

```
{range1)/{*}^2)%}
```

or recursively (22):

```
f:{if%,|:)-:1{f~.,}1=}
```

FizzBuzz (32):

```
{100*{"Fizz"*!%3)+"Buzz"*!%5)|}}
```

Esolang commenter (43):

```
{a:0;s:$1/?|)%{? *a++? *(1+len*"")-a+:len)+$2}}
```

Swap every two (17)

```
{/len/2)%rev~*[]}
```

Print a block diagonal matrix

```
puts{}%$1/?,
```

Arrays

```
[1; 2; 3]
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
pi : 3.14159;
fn rad(deg) {deg * (pi / 180)}

# main.yak
use math;
math.rad(.) + 0.2
```

globals are automatically imported

Built-ins:

| name   | function                                                         |
| ------ | ---------------------------------------------------------------- |
| .      | First lambda argument                                            |
| ,      | Second lambda argument                                           |
| +      | Add / concat / lambda compose                                    |
| -      | Subtract / set diff                                              |
| \*     | Multiply / join / n times / reduce by                            |
| /      | Divide / split / n equal chunks                                  |
| ^      | Exponent                                                         |
| %      | Mod / map                                                        |
| \<=>   | Comparison                                                       |
| !&\|   | Not / And / Or                                                   |
| if     | `if (cond) {then} [else]`                                        |
| len    | Length of string or list                                         |
| rev    | Reverse string or list                                           |
| range  | All ints in the interval `[b, a)`                                |
| n      | Newline                                                          |
| tobase | `a tobase b` converts an int or list of base-10 digits to base b |
| toint  | `toint a b` converts a list of base-b digits to an int           |

---

---

Compile to JS process:

1. Parse to tree of operator calls and literals, with precedence established
2. Fill gaps with appropriate variables
3. Compile op-calls to function calls
4. Compile literals
5. Implicit input and output
