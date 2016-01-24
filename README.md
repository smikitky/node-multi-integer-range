# multi-integer-range

[![Build Status](https://travis-ci.org/smikitky/node-multi-integer-range.svg?branch=master)](https://travis-ci.org/smikitky/node-multi-integer-range)

A library which parses and manipulates comma-delimited positive integer ranges (such as "1-3,8-10").

Such strings are typically used in print dialogs to indicate which pages to print.

Supported operations include:

- Addition (e.g., `1-2,6` + `3-5` => `1-6`)
- Subtraction (e.g., `1-10` - `5-9` => `1-4,10`)
- Inclusion check (e.g., `3,7-9` is in `1-10`)
- Intersection (e.g., `1-5` ∩ `2-8` => `2-5`)
- Array creation

Internal data are always *sorted and normalized* to the smallest possible
representation.

## Usage

### Basic Example

Install via npm: `npm install multi-integer-range`

```js
var MultiRange = require('multi-integer-range').MultiRange;

var pages = new MultiRange('1-5,12-15');
pages.append(6).append([7,8]).append('9-11').subtract(2);
console.log(pages.toString()); // '1,3-15'
console.log(pages.has('5,9,12-14')); // true

// output
console.log(pages.toArray()); // [1, 3, 4, 5, ... , 15]
console.log(pages.getRanges()); // [[1, 1], [3, 15]]
console.log(pages.isContinuous()); // false
```

### Initialization

Some methods (and the constructor) take one *Initializer* parameter.
An initializer is an integer array, an array of `[number, number]` tuples,
a string, a single integer, or another MultiRange instance.

Pass it to the constructor to create a MultiRange object,
or pass nothing to create an empty MultiRange object.

```ts
type Initializer =
    string |
    number |
    ( number | [number,number] )[] |
    MultiRange;
```

A shorthand constructor function `multirange()` is also available.
Use whichever you prefer.

```js
var MultiRange = require('multi-integer-range').MultiRange;

var mr1 = new MultiRange([7, 2, 9, 1, 8, 3]);
var mr2 = new MultiRange('1-2, 3, 7-9');
var mr3 = new MultiRange([[1,3], [7,9]]);
var mr4 = new MultiRange(mr1); // clone

// function-style
var multirange = require('multi-integer-range').multirange;
var mr5 = multirange('1,2,3,7,8,9'); // the same as `new MultiRange`
```

Internal data are always sorted and normalized,
so the above five (`mr1`-`mr5`) hold a instance with identical range data.

The string parser is permissive and accepts space characters
before/after comma/hyphens. Order is not important either, and
overlapped numbers are silently ignored.

```js
var mr = new MultiRange('3,\t8-3,2,3,\n10, 9 - 7 ');
console.log(mr.toString()); // prints '2-10'
```

### Methods

Manipulation methods are mutable and chainable by design.
That is, for example, when you call `append(5)`, it will change
the internal representation and return the modified self,
rather than returning a new instance.
To get the copy of the instance, use `clone()`, or alternatively the copy constructor (`var copy = new MultiRange(orig)`).

- `new MultiRange(data?: Initializer)` Creates a new MultiRange object.
- `clone(): MultiRange` Clones this instance.
- `append(value: Initializer): MultiRange` Appends to this instance.
- `appendRange(min: number, max: number): MultiRange` Appends one range specified by the two parameters.
- `subtract(value: Initializer): MultiRange` Subtracts from this instance.
- `subtractRange(min: number, max: number): MultiRange` Subtracts one range specified by the two parameters.
- `intersect(value: Initializer): MultiRange` Remove integers which are not included in `value` (aka intersection).
- `has(value: Initializer): boolean` Checks if the instance contains the specified value.
- `hasRange(min: number, max: number): boolean` Checks if the instance contains the range specified by the two parameters.
- `isContinuous(): boolean` Checks if the current instance is continuous. Note that this returns false if the current range is empty.
- `length(): number` Calculates how many numbers are effectively included in this instance. (`multirange('1-10,51-60,90').length()` returns 21)
- `equals(cmp: Initializer): boolean` Checks if two MultiRange data are identical.
- `toString(): string` Returns the string respresentation of this MultiRange.
- `getRanges(): [number, number][]` Exports the whole range data as an array of [number, number] arrays.
- `toArray(): number[]` Builds an array of integer which holds all integers in this MultiRange. Note that this may be slow and memory-consuming for large ranges such as '1-10000'.
- `getIterator(): Object` Returns ES6-compatible iterator. See the description below.

### Iteration

**ES6 iterator**: If `Symbol.iterator` is defined in the runtime,
you can simply iterate over the instance using the `for ... of` statement:

```js
for (let page of multirange('2,5-7')) {
    console.log(page);
}
// prints 2, 5, 6, 7
```

If `Symbol.iterator` is not defined, you can still access the iterator
implementation and use it manually like this:

```js
var it = multirange('2,5-7').getIterator(),
    page;
while (!(page = it.next()).done) {
    console.log(page.value);
}
```

## Use in Browsers

This library should be Browserify-friendly.

## Development

### Building and Testing

```
npm install
npm run-script build
npm test
```

### Bugs

Report any bugs and suggestions using GitHub issues.

**Performance Considerations**: This library works efficiently for large ranges as long as they're *mostly* continuous (e.g., `1-10240000,20480000-50960000`). However, this library is not intended to be efficient with a heavily fragmentated set of integers which are scarcely continuous (for example, random 10000 integers between 1 to 1000000).

## Author

Soichiro Miki (https://github.com/smikitky)

## License

MIT
