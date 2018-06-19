# multi-integer-range

[![Build Status](https://travis-ci.org/smikitky/node-multi-integer-range.svg?branch=dev)](https://travis-ci.org/smikitky/node-multi-integer-range)
[![Coverage Status](https://coveralls.io/repos/github/smikitky/node-multi-integer-range/badge.svg?branch=dev)](https://coveralls.io/github/smikitky/node-multi-integer-range)
[![npm version](https://badge.fury.io/js/multi-integer-range.svg)](https://badge.fury.io/js/multi-integer-range)

A small library which parses and manipulates comma-delimited integer ranges (such as "1-3,8-10"), which are typically used in print dialogs to indicate which pages to print.

Supported operations:

- Addition (e.g., `1-2,6` + `3-5` => `1-6`)
- Subtraction (e.g., `1-10` - `5-9` => `1-4,10`)
- Inclusion check (e.g., `3,7-9` is in `1-10`)
- Intersection (e.g., `1-5` ∩ `2-8` => `2-5`)
- Unbounded ranges (e.g., `5-` to mean "all integers >= 5") (optional)
- Ranges including negative integers or zero
- ES6 iterator (`for ... of`, spread operator)
- Array creation ("flatten")

Internal data are always _sorted and normalized_ to the smallest possible representation.

## Usage

### Install

Install via npm or yarn: `npm install multi-integer-range`

This library has no external dependencies, and can be used with module bundlers such as Webpack.

### Basic Example

```js
import MultiRange from 'multi-integer-range';
// OR:
// const MultiRange = require('multi-integer-range').MultiRange;
// const MultiRange = require('multi-integer-range').default;

const pages = new MultiRange('1-5,12-15');
pages
  .append(6)
  .append([7, 8])
  .append('9-11')
  .subtract(2);
console.log(pages.toString()); // '1,3-15'
console.log(pages.has('5,9,12-14')); // true

console.log(pages.toArray()); // [1, 3, 4, 5, ... , 15]
console.log(pages.getRanges()); // [[1, 1], [3, 15]]
console.log(pages.segmentLength()); // 2
```

### Initializers

Some methods and the constructor take one _Initializer_ parameter.
An initializer is one of the followings:

- a valid string (e.g., `'1-3,5'`)
- an array of integers (e.g., `[1, 2, 3, 5]`)
- an array of `[min, max]` tuples (e.g., `[[1, 3], [5, 5]]`)
- mixture of integers and tuples (e.g., `[[1, 3], 5]`)
- a single integer (e.g., `1`)
- another MultiRange instance

Pass it to the constructor to create a MultiRange object,
or pass nothing to create an empty MultiRange object.
A shorthand constructor function `multirange()` is also available,
which you can use according to your preference.

```ts
type Initializer = string | number | MultiRange | (number | [number, number])[];
```

```js
import MultiRange, { multirange } from 'multi-integer-range';

const mr1 = new MultiRange([7, 2, 9, 1, 8, 3]);
const mr2 = new MultiRange('1-2, 3, 7-9');
const mr3 = new MultiRange([[1, 3], [7, 9]]);
const mr4 = new MultiRange(mr1); // clone
const mr5 = multirange('1,2,3,7,8,9');
```

The above five (`mr1`-`mr5`) hold a instance with identical range data
because internal data are always normalized.

The string parser is permissive and accepts space characters
before/after comma/hyphens. Order is not important either, and
overlapped numbers are silently ignored.

```js
const mr = new MultiRange('3,\t8-3,2,3,\n10, 9 - 7 ');
console.log(mr.toString()); // prints '2-10'
```

### API

Manipulation methods are mutable and chainable by design.
That is, for example, when you call `append(5)`, it will change
the internal representation and return the modified self,
rather than returning a new instance.
To get a copy of the instance, use `clone()`, or alternatively the copy constructor (`var copy = new MultiRange(orig)`).

- `new MultiRange(data?: Initializer, options?)` Creates a new MultiRange object.
  The `options` object modifies the parsing behavior (see below).
- `clone(): MultiRange` Clones this instance.
- `append(value: Initializer): MultiRange` Appends `value` to this instance.
- `subtract(value: Initializer): MultiRange` Subtracts `value` from this instance.
- `intersect(value: Initializer): MultiRange` Removes integers which are not included in `value` (aka intersection).
- `has(value: Initializer): boolean` Checks if the instance contains `value`.
- `length(): number` Calculates how many numbers are effectively included in this instance (ie, 5 for '3,5-7,9'). Returns Inifnity for an unbounded range.
- `segmentLength(): number` Returns the number of range segments (ie, 3 for '3,5-7,9' and 0 for an empty range)
- `equals(cmp: Initializer): boolean` Checks if two MultiRange data are identical.
- `isUnbounded(): boolean` Returns if the instance is unbounded.
- `min(): number | undefined` Returns the minimum integer. May return -Infinity.
- `max(): number | undefined` Returns the maxinum integer. May return Infinity.
- `shift(): number | undefined` Removes the minimum integer and returns it.
- `pop(): number | undefined` Removes the maxinum integer and returns it.
- `toString(): string` Returns the string respresentation of this MultiRange.
- `getRanges(): [number, number][]` Exports the whole range data as an array of [number, number] tuples.
- `toArray(): number[]` Builds an array of integer which holds all integers in this MultiRange. This may be slow and memory-consuming for large ranges such as '1-10000'.
- `getIterator(): Object` Returns an ES6-compatible iterator. See the description below.

Available `options` that can be passed to the constructor:

- `parseNegative` (boolean, default = false): Enables parsing negative ranges (e.g., `(-10)-(-3)`).
- `parseUnbounded` (boolean, default = false): Enables parsing unbounded ranges (e.g., `-5,10-`).

### Unbounded Ranges (optional)

You can use unbounded (aka infinite) ranges.
Parsing unbounded ranges is disabled by default,
and you have to enable it via the `parseUnbounded` option parameter.

```js
// The `parseUnbounded` option enables unbounded ranges.
const unbounded = value => multirange(value, { parseUnbounded: true });

const range1 = unbounded('5-'); // all integers >= 5
const range2 = unbounded('-3'); // all integers <= 3
const range3 = unbounded('-'); // all integers

// Or use the JavaScript constant `Infinity`
// to programmatically create unbounded ranges.
const range4 = multirange([[5, Infinity]]); // all integers >= 5
const range5 = multirange([[-Infinity, 3]]); // all integers <= 3
const range6 = multirange([[-Infinity, Infinity]]); // all integers
```

Note that the `parseUnbounded` option only affects the way _string_ initializers are parsed.
You do not have to pass any option to create unbounded ranges using non-string initializers.
Once `parseUnbounded` is enabled at the constructor,
subsequent chained methods will also correctly parse unbounded ranges.

The manipulation methods work just as expected with unbounded ranges:

```js
const unbounded = value => multirange(value, { parseUnbounded: true });

// Chained methods recognize unbounded ranges, too
console.log(unbounded('5-10,15-').append('0,11-14') + ''); // '0,5-'
console.log(unbounded('-').subtract('3-5,7,11-') + ''); // '-2,6,8-10'
console.log(unbounded('-5,10-').has('-3,20')); // true

// Intersection is especially useful to "trim" any unbounded ranges:
const userInput = '-10,15-20,90-';
const pagesInMyDoc = [[1, 100]]; // '1-100'
const pagesToPrint = unbounded(userInput).intersect(pagesInMyDoc);
console.log(pagesToPrint.toString()); // prints '1-10,15-20,90-100'
```

Unbounded ranges cannot be iterated over, and you cannot call `toArray()` for obvious reasons.
Calling `length()` for unbounded ranges will return `Infinity`.

### Ranges Containing Zero and Negative Integers

You can safely handle ranges containing zero and negative integers, including `-Infinity`.

The syntax for denoting negative integers in a string initializer is a bit tricky, though;
you need to _always_ contain all negative integers in parentheses.
You also need to pass `parseNegative` option to make the parser recognize
negative integers contained in parentheses.

```js
const mr1 = new MultiRange('(-5),(-1)-0', { parseNegative: true }); // -5, -1 and 0
mr1.append([[-4, -2]]); // -4 to -2
console.log(mr1 + ''); // prints '(-5)-0'
```

Note that the `parseNegative` option only affects the way string initializers are parsed.
You do not have to pass any option to create negative ranges using non-string initializers.

Once `parseNegative` is enabled at the constructor,
subsequent chained methods will also recognize and parse negative ranges.

```js
const mr2 = multirange('(-5)', { parseNegative: true }).append('(-3)');
console.log(mr2); // prints '(-5),(-3)'
```

### Iteration

**ES2015 (ES6) iterator**: If `Symbol.iterator` is defined
(either natively or by a polyfill), you can simply iterate over the instance like this:

```js
for (const page of multirange('2,5-7')) {
  console.log(page);
} // prints 2, 5, 6 and 7

// Instead of calling toArray() ...
const arr = [...multirange('2,5-7')]; // array spreading
// arr becomes [2, 5, 6, 7]
```

If `Symbol.iterator` is not available, you can still access the iterator
implementation and use it manually like this:

```js
var it = multirange('2,5-7').getIterator(),
  page;
while (!(page = it.next()).done) {
  console.log(page.value);
}
```

## TypeScript Definition File

This library comes with a TypeScript definition file.
Starting from TS 1.6, the compiler can find this definition file automatically.

The definition file only contains declarations that are compatible with ES5.
If your TypeScript project needs support for iterators (e.g., `for ... of` or `[...multirange('1-5')]`),
add the following snippet somewhere in your project to avoid compile-time errors.

```ts
declare module 'multi-integer-range' {
  interface MultiRange {
    [Symbol.iterator](): Iterator<number>;
  }
}
```

In addition, if your project is `--target es5`, you'll need a polyfill for symbols,
`--downlevelIteration` compile option (available since TS 2.3),
plus `--lib es2015.iterable` compile option.
If these bother you, you can always manually use `getIterator()` as described above.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Caveats

**Performance Considerations**: This library works efficiently for large ranges
as long as they're _mostly_ continuous (e.g., `1-10240000,20480000-50960000`).
However, this library is not intended to be efficient
with a heavily fragmentated set of integers which are scarcely continuous
(e.g., random 10000 integers between 1 to 1000000).

**Integer Type Checking**: Make sure you are not passing floating-point `number`s
to this library. For example, don't do `new MultiRange(0.5);`.
For performance reasons, the library does not check if a passed number is an integer.
Passing a float will result in unexpected and unrecoverable behavior.

## Development

### Building and Testing

```
npm install
npm run build
npm test
```

### Bugs

Please report any bugs and suggestions using GitHub issues.

## Author

Soichiro Miki (https://github.com/smikitky)

## License

MIT
