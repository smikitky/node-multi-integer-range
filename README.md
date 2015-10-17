# multi-integer-range

A library which parses and manipulates comma-delimited positive integer ranges (such as "1-3,8-10").

Such strings are typically used in print dialogs to indicate which pages to print.

Supported operations include

- Addition (e.g., '1-2' + '3-5' => '1-5')
- Subtraction (e.g., '1-10' - '5-9' => '1-4,10')
- Inclusion check (e.g., '5' in '1-10')
- Array creation

Internal data are always *sorted and normalized* to the smallest possible
representation.

## Usage

Install via npm: `npm install multi-integer-range`

### Initialization

Initialization can be done with an integer array, a string, or another MultiRange instance.

```
var MultiRange = require('multi-integer-range').MultiRange;

var mr = new MultiRange([7, 2, 9, 1, 8, 3]);
var mr2 = new MultiRange('1-2, 3, 7-9');
var mr3 = new MultiRange(mr);
```

Internal data are always sorted and normalized,
so the above three constructor create instances with identical data.

The string parser is permissive, accepting space characters
before/after comma/hyphens. Order is not important either, and
overlapped numbers are silently ignored.

```
var mr = new MultiRange('3,\t8-3,2,3,\n10, 9 - 7 ');
console.log(mr.equals('2-10')); // prints true
```

### Manipulation and Comparison

```
var mr = new MultiRange('1-3,7-9');

// Addition
mr.append('4-5')
  .append(6)
  .append(new MultiRange('10-11'))
  .appendRange(12, 15); // append 12-15

console.log('' + mr); // prints '1-15'

// Subtraction
mr.subtract('2-8');
console.log('' + mr); // prints '1,9-15'

// Equality check
console.log(mr.equals('1,9-12,13,14,15')); // true

// Inclusion check
console.log(mr.has(10)); // true
console.log(mr.has(100)); // false
```

### Output

There are several ways to get the content of the MultiRange object.

```
var mr = new MultiRange([1,2,3,5,6,7,8]);

// As a string
console.log(mr.toString()); // '1-3,5-8'

// Or concat an empty string to implicitly call #toString()
console.log('' + mr); // '1-3,5-8'

// As an array which holds every integer (of course slow for large range)
console.log(mr.toArray()); // [1,2,3,5,6,7,8]

// As an array of 2-element arrays
console.log(mr.getRanges()); // [[1,3],[5,8]]
```

### Iteration

A quick-and-dirty way to iterate over a MultiRange is something like this:

```
var pages = (new MultiRange('1-10')).toArray();
for (var i = 0; i < pages.length; i++) {
  console.log(pages[i]);
}
```

Currently there is no built-in iterators/generators support,
but you can easily write your own generators to iterate over a MultiRange.
An example is found in `examples/iterator-generator.js`.

## Use in Browsers

This library should be Browserify-friendly,
but you need ES5 Array iterator polyfill for IE8 support.

## Development

### Building and Testing

```
npm install
npm run-script build
npm test
```

### Bugs

Use GitHub issues.

## Author

Soichiro Miki (https://github.com/smikitky)

## License

MIT
