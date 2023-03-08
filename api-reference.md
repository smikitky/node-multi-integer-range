# multi-integer-range API Reference

- All functions are *pure* functions. They do not alter the input arguments nor do they have side effects.
- All functions and types are exported as named exports.
- All MultiIntegerRange returned by these functions are normalized.
- The legacy `MultiRange` class is also available but is not documented here. See the docs for v4 for this.

## Contents

- [`parse()`](#function-parse)
- [`normalize()`](#function-normalize)
- [`initialize()`](#function-initialize)
- [`append()`](#function-append)
- [`subtract()`](#function-subtract)
- [`intersect()`](#function-intersect)
- [`has()`](#function-has)
- [`length()`](#function-length)
- [`isUnbounded()`](#function-isunbounded)
- [`equals()`](#function-equals)
- [`min()`](#function-min)
- [`max()`](#function-max)
- [`at()`](#function-at)
- [`tail()`](#function-tail)
- [`init()`](#function-init)
- [`stringify()`](#function-stringify)
- [`flatten()`](#function-flatten)
- [`iterate()`](#function-iterate)

---

## type: `Range`

```ts
type Range = readonly [min: number, max: number];
```

A `[min, max]` tuple to denote one integer range.

---

## type: `MultiIntegerRange`

```ts
type MultiIntegerRange = readonly Range[];
```

An immutable Range array. This is the fundamental data type of this package.

**Warning**: Most functions of this package work correctly
only when **normalized** MultiIntegerRange's are passed.
If you have a Range array that may not be sorted, use [`normalize()`](#function-normalize) first.

---

## function: `parse`

```ts
parse(data: string, options?: Options): MultiIntegerRange
```

| Param | Description |
|-|-|
| `data` | The string to parse. |
| `options` | Options to modify the parsing behavior. |
| Returns | A new normalized MultiIntegerRange. |

Parses a string and creates a new MultiIntegerRange.

- `options.parseNegative` (boolean): When set to true, parses negative integers enclosed in parentheses.
- `options.parseUnbounded` (boolean): When set to true, parses unbounded ranges like `10-` or `-10`.

This is the default parser, but you don't necessary have to use this.
You can create your own parser to suit your needs
as long as it produces a normalized array of `Range`s.

### Example

```ts
parse('1-10'); // [[1, 10]]
parse(' 10-, 7', { parseUnbounded: true }); // [[7, 7], [10, Infinity]]
```

---

## function: `normalize`

```ts
normalize(data?: (number | Range)[] | number): MultiIntegerRange
```

| Param | Description |
|-|-|
| `data` | A number or an unsorted array, e.g., `[[7, 5], 1]`. |
| Returns | Normalized array, e.g., `[[1, 1], [5, 7]]`. |

Takes a number or an unsorted array of ranges,
and returns a new normalized MultiIntegerRange.

Here, "normalized" means the range data is in the smallest possible
representation and is sorted in ascending order.

This is the only function that can take an unsorted array of Range's.
Unsorted range data MUST be normalized before being passed to
other functions such as [`append()`](#function-append) and [`length()`](#function-length).

### Example

```ts
normalize(5); // [[5, 5]]
normalize([1, 8]); // [[1, 1], [8, 8]]
normalize([[1, 8]]); // [[1, 8]]
normalize([2, 3, 1, 5, 4, 0, 1, 3]); // [[0, 5]]
normalize([[Infinity, 1]]); // [[1, Infinity]]
```

---

## function: `initialize`

```ts
initialize(
  data?: (number | Range)[] | number | string,
  options?: Options
): MultiIntegerRange
```

| Param | Description |
|-|-|
| `data` | Anything understood by either [`parse()`](#function-parse) or [`normalize()`](#function-normalize). |
| `options` | Parse options passed to [`parse()`](#function-parse). |
| Returns | A new normalized MultiIntegerRange. |

Takes any supported data and returns a normalized MultiIntegerRange.
Conditionally calls either [`parse()`](#function-parse) or [`normalize()`](#function-normalize) under the hood.
This is an equivalent of "initializer" constructor of version &le; 4.

### Example

```ts
initialize(5); // [[5, 5]]
initialize('2-8'); // [[2,8]]
```

---

## function: `append`

```ts
append(a: MultiIntegerRange, b: MultiIntegerRange): MultiIntegerRange
```

| Param | Description |
|-|-|
| `a` | The first value. |
| `b` | The second value. |
| Returns | A new MultiIntegerRange containing all integers that belong to **either `a` or `b` (or both)**. |

Appends two MultiIntegerRange's.

### Example

```ts
append([[1, 5]], [[3, 8], [10, 15]]); // [[1, 8], [10, 15]]
append([[5, 9]], [[-Infinity, 2]]); // [[-Infinity, 2], [5, 9]]
```

---

## function: `subtract`

```ts
subtract(a: MultiIntegerRange, b: MultiIntegerRange): MultiIntegerRange
```

| Param | Description |
|-|-|
| `a` | The value to be subtracted. |
| `b` | The value to subtract. |
| Returns | A new MultiIntegerRange containing all integers that belong to **`a` but not `b`**. |

Subtracts the second value from the first value.

### Example

```ts
subtract([[1, 7]], [[2, 4]]); // [[1, 1], [5, 7]]
subtract([[-Infinity, Infinity]], [[2, 4]]); // [[-Infinity, 1], [5, Infinity]]
```

---

## function: `intersect`

```ts
intersect(a: MultiIntegerRange, b: MultiIntegerRange): MultiIntegerRange
```

| Param | Description |
|-|-|
| `a` | The first value. |
| `b` | The second value. |
| Returns | A new MultiIntegerRange containing all integers that belong to **both `a` and `b`**. |

Calculates the intersection (common integers) of the two MultiIntegerRange's.

### Example

```ts
intersect([[2, 5]], [[4, 9]]); // [[4, 5]]
intersect([[5, 10]], [[-Infinity, Infinity]]); // [[5, 10]]
```

---

## function: `has`

```ts
has(a: MultiIntegerRange, b: MultiIntegerRange): boolean
```

| Param | Description |
|-|-|
| `a` | The value that possibly contains `b`. |
| `b` | The value that is possibly contained by `a`. |
| Returns | True if `b` is equal to or a subset of `a`. |

Checks if `a` contains or is equal to `b` (a ⊇ b).

### Example

```ts
has([[0, 100]], [[2, 10]]); // true
has([[5, 7]], [[5, 7]]); // true
has([[2, 10]], [[0, 100]]); // false
```

---

## function: `length`

```ts
length(data: MultiIntegerRange): number
```

| Param | Description |
|-|-|
| `data` | The value to calculate the length on. |
| Returns | The number of integers contained in `data`. May be `Infinity`. |

Calculates how many integers are included in the given MultiIntegerRange.

Note: If you want to know the number of Ranges (segments), just use the
standard `Array#length`.

### Example

```ts
length([[1, 3], [8, 10]]); // 6
length([[1, Infinity]]); // Infinity
```

---

## function: `isUnbounded`

```ts
isUnbounded(data: MultiIntegerRange): boolean
```

| Param | Description |
|-|-|
| `data` | The value to check. |
| Returns | True if `data` is unbounded. |

Checks if the data contains an unbounded (aka inifinite) range.

### Example

```ts
isUnbounded([[1, Infinity]]); // true
isUnbounded([[-Infinity, 4]]); // true
isUnbounded([[7, 9]]); // false
```

---

## function: `equals`

```ts
equals(a: MultiIntegerRange, b: MultiIntegerRange): boolean
```

| Param | Description |
|-|-|
| `a` | The first value to compare. |
| `b` | The second value to compare. |
| Returns | True if `a` and `b` have the same range data. |

Checks if the two values are the same. (Altenatively, you can use any
"deep-equal" utility function.)

### Example

```ts
equals([[1, 5], [7, 8]], [[1, 5], [7, 8]]); // true
equals([[1, 5]], [[2, 7]]); // false
```

---

## function: `min`

```ts
min(data: MultiIntegerRange): number | undefined
```

| Param | Description |
|-|-|
| `data` | The value. |
| Returns | The minimum integer. May be `undefined` or `-Infinity`. |

Returns the minimum integer of the given MultiIntegerRange.

### Example

```ts
min([[2, 5], [8, 10]]); // 2
min([[-Infinity, 0]]); // -Infinity
min([]); // undefined
```

---

## function: `max`

```ts
max(data: MultiIntegerRange): number | undefined
```

| Param | Description |
|-|-|
| `data` | The value. |
| Returns | The minimum integer. May be `undefined` or `Infinity`. |

Returns the maximum integer of the given MultiIntegerRange.

### Example

```ts
max([[2, 5], [8, 10]]); // 10
max([[3, Infinity]]); // Infinity
max([]); // undefined
```

---

## function: `at`

```ts
at(data: MultiIntegerRange, index: number): number | undefined
```

| Param | Description |
|-|-|
| `data` | The value. |
| `index` | The 0-based index of the integer to return. Can be negative. |
| Returns | The N-th integer. Returns `undefined` if the index is out of bounds. |

Returns the N-th integer of the given MultiIntegerRange.
If a negative index is given, the index is counted from the end.

### Example

```ts
at([[2, 4], [8, 10]], 4); // 9
at([[2, 4], [8, 10]], 6); // undefined
at([[2, 4], [8, 10]], -1); // 10
```

---

## function: `tail`

```ts
tail(data: MultiIntegerRange): MultiIntegerRange
```

| Param | Description |
|-|-|
| `data` | The value. |
| Returns | A new MultiIntegerRange which is almost the same as `data` but with its minimum integer removed. |

Returns all but the minimum integer.

### Example

```ts
tail([[2, 5], [8, 10]]); // [[3, 5], [8, 10]]
```

---

## function: `init`

```ts
init(data: MultiIntegerRange): MultiIntegerRange
```

| Param | Description |
|-|-|
| `data` | The value. |
| Returns | A new MultiIntegerRange which is almost the same as `data` but with its maximum integer removed. |

Returns all but the maximum integer.

### Example

```ts
init([[2, 5], [8, 10]]); // [[2, 5], [8, 9]]
```

---

## function: `stringify`

```ts
stringify(data: MultiIntegerRange): string
```

| Param | Description |
|-|-|
| `data` | The MultiIntegerRange to stringify. |
| Returns | The string representation of the given data. |

Returns the string respresentation of the given MultiIntegerRange.

### Example

```ts
stringify([[3, 5], [7, Infinity]]); // '3-5,7-'
```

---

## function: `flatten`

```ts
flatten(data: MultiIntegerRange): number[]
```

| Param | Description |
|-|-|
| `data` | The value to build an array on. |
| Returns | The flattened array of numbers. |

Builds a flattened array of integers.
Note that this may be slow and memory-consuming for large ranges.
Consider using the iterator whenever possible.

### Example

```ts
flatten([[-1, 1], [7, 9]]); // [-1, 0, 1, 7, 8, 9]
```

---

## function: `iterate`

```ts
iterate(
  data: MultiIntegerRange,
  options: IterateOptions = {}
): Iterable<number>
```

| Param | Description |
|-|-|
| `data` | The normalized MultiIntegerRange to iterate over. |
| `options` | Pass `{ descending: true }` to iterate in descending order. |
| Returns | An Iterable object. |

Returns an Iterable with which you can use `for-of` or the spread syntax.

### Example

```ts
Array.from(iterate([[1, 3], [7, 9]])); // [1, 2, 3, 7, 8, 9]
Array.from(iterate([[1, 3], [7, 9]], { descending: true })); // [9, 8, 7, 3, 2, 1]
[...iterate([[-1, 2]])]; // [-1, 0, 1, 2]
```
