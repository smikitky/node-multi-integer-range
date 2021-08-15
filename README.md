# multi-integer-range

[![Build Status](https://github.com/smikitky/node-multi-integer-range/actions/workflows/tests.yml/badge.svg)](https://github.com/smikitky/node-multi-integer-range/actions)
[![Coverage Status](https://coveralls.io/repos/github/smikitky/node-multi-integer-range/badge.svg?branch=dev)](https://coveralls.io/github/smikitky/node-multi-integer-range)
[![npm version](https://badge.fury.io/js/multi-integer-range.svg)](https://badge.fury.io/js/multi-integer-range)

A small library that parses comma-delimited integer ranges (such as `"1-3,8-10"`) and manipulates such range data. This type of data is commonly used to specify which lines to highlight or which pages to print.

Supported operations:

- Addition (e.g., `1-2,6` + `3-5` &rarr; `1-6`)
- Subtraction (e.g., `1-10` - `5-9` &rarr; `1-4,10`)
- Inclusion check (e.g., `3,7-9` &sub; `1-10`)
- Intersection (e.g., `1-5` &cap; `2-8` &rarr; `2-5`)
- Unbounded ranges (e.g., `5-`, meaning "all integers &ge; 5")
- Ranges including negative integers or zero
- ES6 iterator (`for ... of`, spread operator)
- Array creation ("flatten")

Internal data are always _sorted and normalized_ to the smallest possible representation.

## Install

First, choose the right version you need. The API style has changed drastically in version 5. The new API is slightly more verbose but fully tree-shakable.

|                   | 4.x                  | 5.x (alpha)                    |
| ----------------- | -------------------- | ------------------------------ |
| API               | Class-based          | Function-based                 |
| ES version        | Downpiled to ES5     | ES2015                         |
| Module system     | CommonJS (CJS)       | ESM/CJS hybrid (tree-shakable) |
| Immutability      | Mutable method chain | Pure functions only            |
| Supported runtime | Works even on IE     | See below                      |

Supported runtime for version 5.x:

- Node &ge; 10 (uses the CJS version)
- Bundlers such as Webpack can pick the ESM version and benefit from tree-shaking
- Modern browsers can load the ESM version via CDN.
- Deno: Via Skypack, `import * as mr from 'https://cdn.skypack.dev/multi-integer-range@^5.0.0-alpha.1?dts'`

Install via npm or yarn:

```
npm install multi-integer-range@^5.0.0-alpha.1
```

Although not recommended for performance reasons, modern browsers can directly load this package as a standard ES module via CDN:

```html
<script type="module">
  // With unpkg
  import * as mr1 from 'https://unpkg.com/multi-integer-range@^5.0.0-alpha.1/lib/esm/fp.js';
  // With skypack
  import * as mr2 from 'https://cdn.skypack.dev/multi-integer-range@^5.0.0-alpha.1';
  console.log(mr1.parse('7,6,5'));
</script>
```

## Basic Example

> **The following is the documentation for version 5, which is still in alpha. [Go to the docs for version 4](https://github.com/smikitky/node-multi-integer-range/tree/v4.0.9)**

<!-- prettier-ignore -->
```js
import * as mr from 'multi-integer-range';

const ranges1 = mr.parse('1-6,9-12'); // [[1, 6], [9, 12]]
const ranges2 = mr.parse('7-10,100'); // [[7, 10], [100, 100]]
const ranges3 = mr.normalize([1, 5, 6, [4, 2]]); // [[1, 6]]

const sum = mr.append(ranges1, ranges2); // [[1, 12], [100, 100]]
const diff = mr.subtract(ranges1, ranges2); // [[1, 6], [11, 12]]
const commonValues = mr.intersect(ranges1, ranges2); // [[9, 10]]

const str = mr.stringify(sum); // "1-12,100"
const bool = mr.has(ranges1, ranges3); // true
const isSame = mr.equals(ranges1, ranges2); // false
const array = mr.flatten(ranges3); // [1, 2, 3, 4, 5, 6]
const len = mr.length(ranges1); // 10
```

## Creating a _normalized_ MultiIntegerRange

The fundamental data structure of this module is a **normalized** read-only array of `[min, max]` tuples, as shown in the following TypeScript definition. In other words, just an array of 2-element number arrays. Here, "normalized" means the range data is in the smallest possible representation and is sorted in ascending order.

<!-- prettier-ignore -->
```ts
type Range = readonly [min: number, max: number];
type MultiIntegerRange = readonly Range[];
type MIR = MultiIntegerRange; // short alias

// Examples of normalized MultiIntegerRanges
[[1, 3], [4, 4], [7, 10]]
[[-Infinity, -5], [-1, 0], [3, 3], [9, Infinity]]
[[-Infinity, Infinity]]

// These are NOT normalized. Don't pass them to append() and such!
[[3, 1]] // min is larger than max
[[7, 9], [1, 4]] // not in the ascending order
[[1, 5], [3, 7]] // there is an overlap
[[1, 2], [3, 4]] // the two ranges can be combined to "1-4"
[[Infinity, Infinity]] // makes no sense
```

Most functions expect one or more **normalized** MultiIntegerRanges as shown above to work correctly. To produce a valid normalized MultiIntegerRange, you can use `normalize()` or `parse()`.

`normalize(data?: number | (number | Range)[])` creates a normalized MultiIntegerRange from a single number or an unsorted array of numbers/Ranges. Importantly, `normalize()` is the only function that can safely take an unsorted array. Do not pass un-normalized range data to other functions.

<!-- prettier-ignore -->
```ts
console.log(mr.normalize(10)); // [[10, 10]]
console.log(mr.normalize([3, 1, 2, 4, 5])); // [[1, 5]]
console.log(mr.normalize([5, [2, 0], 6])); // [[0, 2], [5, 6]]
console.log(mr.normalize([7, 7, 7, 7, 10])); // [[7, 7], [10, 10]]
console.log(mr.normalize()); // []

// Do not directly pass an un-normalized MultiIntegerRange
// to functions other than normalize().
const unsorted = [[3, 1], [2, 8]];
const wrong = mr.length(unsorted); // This won't work!
const correct = mr.length(mr.normalize(unsorted)); // 8
```

`parse(data: string, options?: Options)` creates a normalized MultiIntegerRange from a string. The string parser is permissive and accepts space characters before/after comma/hyphens. It calls `normalize()` under the hood, so the order is not important, and overlapped numbers are silently ignored.

```ts
console.log(mr.parse('1-3,10')); // [[1, 3], [10, 10]]
console.log(mr.parse('3,\t8-3,2,3,\n10, 9 - 7 ')); // [[2, 10]]
```

By default, the string parser does not try to parse unbounded ranges or negative integers. You need to pass an `options` object to modify the parsing behavior. To avoid ambiguity, all negative integers must always be enclosed in parentheses (sorry for the wacky syntax, but it's always possible to make your custom parsing function if you prefer another syntax).

```ts
console.log(mr.parse('7-')); // throws a SyntaxError

console.log(mr.parse('7-', { parseUnbounded: true })); // [[7, Infinity]]
console.log(mr.parse('(-7)-(-1)', { parseNegative: true })); // [[-7, -1]]
console.log(
  mr.parse('0-,(-6)-(-2),-(-100)', {
    parseUnbounded: true,
    parseNegative: true
  })
); // [[-Infinity, -100], [-6, -2], [0, Infinity]]
```

## API

All functions are "pure", and exported as named exports. They do not change the input data nor do they have any side effects. All MultiIntegerRange's returned by these functions are normalized. `MIR` is just a short alias for `MultiIntegerRange` (available in d.ts).

- `parse(data: string, options?: Options): MIR` Parses the given string. See below for the options.
- `normalize(data?: number | (number | Range)[]): MIR` Normalizes the given number or the array of numbers/Ranges.
- `append(a: MIR, b: MIR): MIR` Appends the two values.
- `subtract(a: MIR, b: MIR): MIR` Subtracts `b` from `a`.
- `intersect(a: MIR, b: MIR): MIR` Calculates the interesction, i.e., integers that belong to both `a` and `b`.
- `has(a: MIR, b: MIR): boolean` Checks if `b` is a subset of `a`.
- `length(data: MIR): number` Calculates how many numbers are effectively included in the given data (i.e., 5 for '3,5-7,9'). Returns Inifnity for unbounded ranges.
- `equals(a: MIR, b: MIR): boolean` Checks if `a` and `b` contains the same range data.
- `isUnbounded(data: MIR): boolean` Returns true if the instance is unbounded.
- `min(data: MIR): number | undefined` Returns the minimum integer. May return -Infinity.
- `max(data: MIR): number | undefined` Returns the maxinum integer. May return Infinity.
- `tail(data: MIR): MIR` Removes the minimum integer.
- `init(data: MIR): MIR` Removes the maxinum integer.
- `stringify(data: MIR): string` Returns the string respresentation of the given data (the opposite of parse()).
- `flatten(data: MIR): number[]` Builds a flat array of integers. This may be slow and memory-consuming for large ranges such as '1-10000'.
- `iterate(data: MIR): Iterable<number>` Returns an ES6 iterable object. See the description below.

Available `options` that can be passed to `parse()`:

- `parseNegative` (boolean, default = false): Enables parsing negative ranges (e.g., `(-10)-(-3)`).
- `parseUnbounded` (boolean, default = false): Enables parsing unbounded ranges (e.g., `-5,10-`).

## Iteration

Since `MultiIntegerRange` is just an array of `Range`s, if you naively iterate over it (e.g., in a for-of loop), you'll simply get each `Range` tuple one by one. To iterate each integer contained in the `MultiIntegerRange` instead, use `iterate()` like so:

```js
const ranges = mr.parse('2,5-7');

for (const page of mr.iterate(ranges)) {
  console.log(page);
} // prints 2, 5, 6 and 7

// array spreading (alternative of flatten())
const arr1 = [...mr.iterate(ranges)]; //=> [2, 5, 6, 7]
const arr2 = Array.from(mr.iterate(ranges)); //=> [2, 5, 6, 7]
```

## Tip

### Combine Intersection and Unbounded Ranges

Intersection is especially useful to "trim" unbounded ranges.

```ts
const userInput = '-5,7-';
const pagesInMyDoc = [[1, 100]]; // '1-100'
const pagesToPrint = mr.intersect(
  mr.parse(userInput, { parseUnbounded: true }),
  pagesInMyDoc
);
console.log(mr.stringify(pagesToPrint)); // '1-5,7-100'
```

## Legacy Classe-based API

For compatibility purposes, version 5.x still exports the `MultiRange` class and `multirange` function, which is mostly compatible with the 4.x API but uses the new functional API under the hood. See the [4.x documentation](https://github.com/smikitky/node-multi-integer-range/tree/v4.0.9) for the usage. The use of this compatibility layer is discouraged because it is not tree-shakable and has no performance merit. Use this only during migration.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Caveats

**Performance Considerations**: This library works efficiently for large ranges
as long as they're _mostly_ continuous (e.g., `1-10240000,20480000-50960000`). However, this library is not intended to be efficient with a heavily fragmented set of integers that are scarcely continuous (e.g., random 10000 integers between 1 to 1000000).

**No Integer Type Checks**: Make sure you are not passing floating-point `number`s
to this library. For example, don't do `normalize(3.14)`. For performance reasons, the library does not check if a passed number is an integer. Passing a float will result in unexpected and unrecoverable behavior.

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
