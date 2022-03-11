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
- Unbounded ranges (aka infinite ranges, e.g., `5-`, meaning "all integers &ge; 5")
- Ranges including negative integers or zero
- ES6 iterator (`for ... of`, spread operator)
- Array creation ("flatten")

The range data are always _sorted and normalized_ to the smallest possible representation.

🚨 **Note (2022-03-11)**: The following README is for the 5.x release, which is still in beta. For the docs of the stable (@latest) release, check the NPM site. 🚨

## Install

Install via npm or yarn:

```
npm install multi-integer-range
```

Version 5 provides both CommonJS and ESM builds. Bundlers such as Webpack can automatically pick the ESM version and perform tree-shaking. This package has no external dependencies nor does it use any Node-specific API.

The API style has changed drastically in version 5. The new API is slightly more verbose, but is simpler and tree-shakable. See the [CHANGELOG](./CHANGELOG.md) and the [docs for version 4](https://github.com/smikitky/node-multi-integer-range/tree/v4.0.9).

<details>
<summary>Deno & Modern Browsers</summary>
Deno users can use Skypack CDN:

```ts
import * as mr from 'https://cdn.skypack.dev/multi-integer-range?dts';
```

Although not recommended from a performance standpoint, modern browsers can directly load this package as a standard ES module via CDN:

```html
<script type="module">
  import * as mr from 'https://cdn.skypack.dev/multi-integer-range';
  console.log(mr.parse('7,6,5'));
</script>
```

Note that you probably want to fixate the version, e.g., multi-integer-range@5.0.3

</details>

## Basic Example

<!-- prettier-ignore -->
```js
import * as mr from 'multi-integer-range';

const ranges1 = mr.parse('1-6,9-12'); // [[1, 6], [9, 12]]
const ranges2 = mr.parse('7-10, 100'); // [[7, 10], [100, 100]]
const ranges3 = mr.normalize([1, 5, 6, [4, 2]]); // [[1, 6]]

const sum = mr.append(ranges1, ranges2); // [[1, 12], [100, 100]]
const diff = mr.subtract(ranges1, ranges2); // [[1, 6], [11, 12]]
const commonValues = mr.intersect(ranges1, ranges2); // [[9, 10]]

const str = mr.stringify(sum); // "1-12,100"
const bool = mr.has(ranges1, ranges3); // true
const isSame = mr.equals(ranges1, ranges2); // false
const array = mr.flatten(diff); // [1, 2, 3, 4, 5, 6, 11, 12]
const len = mr.length(ranges1); // 10
```

## Creating a _normalized_ MultiIntegerRange

The fundamental data structure of this package is a **normalized** array of `[min, max]` tuples, as shown below. Here, "normalized" means the range data is in the smallest possible representation and is sorted in ascending order. You can denote an unbounded range using the JavaScript constant `Infinity`.

<!-- prettier-ignore -->
```ts
type Range = readonly [min: number, max: number];
type MultiIntegerRange = readonly Range[];
type MIR = MultiIntegerRange; // short alias

// Examples of normalized MultiIntegerRanges
[[1, 3], [5, 6], [9, 12]] // 1-3,5-6,9-12
[[-Infinity, 4], [7, 7], [10, Infinity]] // -4,7,10-
[[-Infinity, Infinity]] // all integers
[] // empty

// These are NOT normalized. Don't pass them to append() and such!
[[3, 1]] // min is larger than max
[[7, 9], [1, 4]] // not in the ascending order
[[1, 5], [3, 7]] // there is an overlap
[[1, 2], [3, 4]] // the two ranges can be combined to "1-4"
[[Infinity, Infinity]] // makes no sense
```

Most functions take one or two **normalized** `MultiIntegerRange`s as shown above to work correctly. To produce a valid normalized `MultiIntegerRange`, you can use `normalize()` or `parse()`. (You can write a normalized `MultiIntgerRange` by hand as shown above, too.)

`normalize(data?: number | (number | Range)[])` creates a normalized `MultiIntegerRange` from a single integer or an unsorted array of integers/`Range`s. This is the only function that can safely take an unsorted array. Do not pass unnormalized range data to other functions.

<!-- prettier-ignore -->
```ts
console.log(mr.normalize(10)); // [[10, 10]]
console.log(mr.normalize([3, 1, 2, 4, 5])); // [[1, 5]]
console.log(mr.normalize([5, [2, 0], 6])); // [[0, 2], [5, 6]]
console.log(mr.normalize([7, 7, 10, 7, 7])); // [[7, 7], [10, 10]]
console.log(mr.normalize()); // []

// Do not directly pass an unnormalized array
// to functions other than normalize().
const unsorted = [[3, 1], [2, 8]];
const wrong = mr.length(unsorted); // This won't work!
const correct = mr.length(mr.normalize(unsorted)); // 8
```

`parse(data: string, options?: Options)` creates a normalized `MultiIntegerRange` from a string. The string parser is permissive and accepts space characters before/after comma/hyphens. It calls `normalize()` under the hood, so the order is not important, and overlapped numbers are silently ignored.

```ts
console.log(mr.parse('1-3,10')); // [[1, 3], [10, 10]]
console.log(mr.parse('3,\t8-3,2,3,\n10, 9 - 7 ')); // [[2, 10]]
```

By default, the string parser does not try to parse unbounded ranges or negative integers. You need to pass an `options` object to modify the parsing behavior. To avoid ambiguity, all negative integers must always be enclosed in parentheses. If you don't like the default `parse()`, you can always create and use your custom parsing function instead, as long as it returns a normalized `MultiIntegerRange`.

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

## API Reference

All functions are "pure", and are exported as named exports. They do not change the input data nor do they have any side effects. All `MultiIntegerRange`s returned by these functions are normalized. `MIR` is just a short alias for `MultiIntegerRange` (also available in d.ts).

- `parse(data: string, options?: Options): MIR` Parses the given string. See below for the options.
- `normalize(data?: number | (number | Range)[]): MIR` Normalizes the given number or the array of numbers/Ranges.
- `append(a: MIR, b: MIR): MIR` Appends the two values.
- `subtract(a: MIR, b: MIR): MIR` Subtracts `b` from `a`.
- `intersect(a: MIR, b: MIR): MIR` Calculates the interesction, i.e., integers that belong to both `a` and `b`.
- `has(a: MIR, b: MIR): boolean` Checks if `b` is equal to or a subset of `a`.
- `length(data: MIR): number` Calculates how many numbers are effectively included in the given data (i.e., 5 for '3,5-7,9'). Returns Inifnity for unbounded ranges.
- `equals(a: MIR, b: MIR): boolean` Checks if `a` and `b` contains the same range data. (If you like, you can use other deep-equal utilities instead.)
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

Since a `MultiIntegerRange` is just an array of `Range`s, if you naively iterate over it (e.g., in a for-of loop), you'll simply get each `Range` tuple one by one. To iterate each integer contained in the `MultiIntegerRange` instead, use `iterate()` like so:

```ts
const ranges = mr.parse('2,5-7');

for (const page of ranges) {
  console.log(page);
} // prints 2 items: [2, 2] and [5, 7]

for (const page of mr.iterate(ranges)) {
  console.log(page);
} // prints 4 items: 2, 5, 6 and 7

// array spreading (alternative of flatten())
const arr1 = [...mr.iterate(ranges)]; //=> [2, 5, 6, 7]
const arr2 = Array.from(mr.iterate(ranges)); //=> [2, 5, 6, 7]
```

## Tip

### Combine Intersection and Unbounded Ranges

Intersection is especially useful to "trim" unbounded ranges.

```ts
const userInput = '-5,15-';
const pagesInMyDoc = [[1, 20]]; // '1-20'
const pagesToPrint = mr.intersect(
  mr.parse(userInput, { parseUnbounded: true }),
  pagesInMyDoc
);
for (const page of mr.iterate(pagesToPrint)) await printPage(page);
```

## Legacy Classe-based API

For compatibility purposes, version 5 exports the `MultiRange` class and `multirange` function, which is mostly compatible with the 4.x API but has been rewritten to use the new functional API under the hood. See the [4.x documentation](https://github.com/smikitky/node-multi-integer-range/tree/v4.0.9) for the usage. The use of this compatibility layer is discouraged because it is not tree-shakable and has no performance merit. Use this only during migration. These may be removed in the future.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Caveats

**Performance Considerations**: This library works efficiently for large ranges
as long as they're _mostly_ continuous (e.g., `1-10240000,20480000-50960000`). However, this library is not intended to be efficient with a heavily fragmented set of integers that are scarcely continuous (e.g., random 10000 integers between 1 to 1000000).

**No Integer Type Checks**: Make sure you are not passing floating-point `number`s
to this library. For example, don't do `normalize(3.14)`. For performance reasons, the library does not check if a passed number is an integer. Passing a float will result in unexpected and unrecoverable behavior.

## Development

To test:

```
npm ci
npm test
```

To generate CJS and ESM builds:

```
npm ci
npm run build
```

Please report bugs and suggestions using GitHub issues.

## Author

Soichiro Miki (https://github.com/smikitky)

## License

MIT
