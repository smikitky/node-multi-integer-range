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

---

🚨 **Note**: The following README is for the 5.x release, whose API has changed drastically. For the docs of the 4.x release, see [this](https://github.com/smikitky/node-multi-integer-range/tree/v4.0.9).

## Install

Install via npm or yarn:

```
npm install multi-integer-range
```

Version 5 is a hybrid package; it provides both a CommonJS version and an ES Module version, built from the same TypeScript source. Bundlers such as Webpack can automatically pick the ESM version and perform tree-shaking. This package has no external dependencies nor does it use any Node-specific API.

🚨 The API style has changed drastically in version 5. The new API is slightly more verbose, but is simpler and tree-shakable 🌲. For example, if you don't use the default parser, your bundle will not include it. See the [CHANGELOG](./CHANGELOG.md) and the [docs for version 4](https://github.com/smikitky/node-multi-integer-range/tree/v4.0.9).

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

The fundamental data structure of this package is a **normalized** array of `[min, max]` tuples, as shown below. Here, "normalized" means the range data is in the smallest possible representation and is sorted in ascending order. You can denote an unbounded (aka infinite) range using the JavaScript constant `Infinity`.

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
[[1, 5], [3, 7]] // there is an overlap of ranges
[[1, 2], [3, 4]] // the two ranges can be combined to "1-4"
[[Infinity, Infinity]] // makes no sense
```

Most functions take one or two **normalized** `MultiIntegerRange`s as shown above to work correctly. To produce a valid normalized `MultiIntegerRange`, you can use `normalize()`, `parse()` or `initialize()`. (You can write a normalized `MultiIntgerRange` by hand as shown above, too.)

`normalize(data?: number | (number | Range)[])` creates a normalized `MultiIntegerRange` from a single integer or an unsorted array of integers/`Range`s. This and `initialize` are the only functions that can safely take an unsorted array. Do not pass unnormalized range data to other functions.

<!-- prettier-ignore -->
```ts
console.log(mr.normalize(10)); // [[10, 10]]
console.log(mr.normalize([3, 1, 2, 4, 5])); // [[1, 5]]
console.log(mr.normalize([5, [2, 0], 6, 4])); // [[0, 2], [4, 6]]
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

See [api-reference.md](api-reference.md).

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
const pagesInMyDoc = [[1, 20]]; // (1-20)
const pagesToPrint = mr.intersect(
  mr.parse(userInput, { parseUnbounded: true }),
  pagesInMyDoc
); // [[1, 5], [15, 20]]
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

## Comparison with Similar Libraries

[range-parser](https://www.npmjs.com/package/range-parser) specializes in parsing range requests in HTTP headers as defined in RFC 7233. It comes with behavior that cannot be turned off and is inappropriate for other purposes. For example, `'-5'` means "last 5 bytes".

[parse-numeric-range](https://www.npmjs.com/package/parse-numeric-range) is fine for small ranges, but it always builds a "flat" array, so it is very inefficient for large ranges such as byte ranges. Also, whether you like it or not, it handles overlapping or descending ranges as-is without normalization. For example, `'4-2,1-3'` results in `[4, 3, 2, 1, 2, 3]`.

multi-integer-range is a general-purpose library for handling this type of data structure. It has a default parser that is intuitive enough for many purposes, but you can also use a custom parser. Its real value lies in its ability to treat normalized ranges as intermediate forms, allowing for a variety of mathematical operations. See the [API reference](api-reference.md).

| Input     | multi-integer-range           | range-parser                              | parse-numeric-range        |
| --------- | ----------------------------- | ----------------------------------------- | -------------------------- |
| '1-3'     | [[1, 3]]                      | [{ start: 1, end: 3 }]                    | [1, 2, 3]                  |
| '1-1000'  | [[1, 1000]]                   | [{ start: 1, end: 1000 }]                 | [1, 2, ..., 999, 1000 ] ⚠️ |
| '5-1'     | [[1, 5]]                      | (error)                                   | [5, 4, 3, 2, 1]            |
| '1-3,2-4' | [[1, 4]]                      | [{ start: 1, end: 4 }] <sup>1</sup>       | [1, 2, 3, 2, 3, 4]         |
| '4-2,1-3' | [[1, 4]]                      | [{ start: 1, end: 3 }] ⚠️<sup>1</sup>     | [4, 3, 2, 1, 2, 3]         |
| '-5'      | [[-Infinity, 5]] <sup>2</sup> | [{ start: 9995, end: 9999 }] <sup>3</sup> | [-5]                       |
| '5-'      | [[5, Infinity]] <sup>2</sup>  | [{ start: 5, end: 9999 }] <sup>3</sup>    | []                         |

<sup>1</sup>: With `combine` option. <sup>2</sup>: With `parseUnbounded` option. <sup>3</sup>: When size is 10000.

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
