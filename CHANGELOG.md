# Changelog

## v5.2.0

- Added `individualThreshold` option to `stringify()`.

## v5.1.0

- Introduced the `at()` function, which can be used to access the N-th smallest/largest integer.
- `iterate()` now accepts an option to iterate in descending order.

## v5.0.0

**❗️ Breaking Changes**

The API has changed radically in version 5. The new API is slightly more verbose, but is simpler and tree-shakable.

|                   | 4.x                     | 5.x                           |
| ----------------- | ----------------------- | ----------------------------- |
| API architecture  | Class-based             | Function-based                |
| Range data        | Encapsulated in objects | Just an array of arrays       |
| ES version        | Downpiled to ES5        | ES2015                        |
| Module system     | CommonJS (CJS)          | CJS/ESM hybrid                |
| Immutability      | Mutable method chain    | Pure functions only           |
| Supported runtime | Works even on IE        | Modern browsers, Node &ge; 10 |

- Dropped support for IE and old Node.
- Migrated to pure function-style API and added an ESM build. This package is now fully tree-shakable.
- In addition to the change from methods to simple functions, some functions have also been renamed or removed.

  - (constructor): Use `parse()` or `normalize()`.
  - `toArray`: Renamed to `flatten()`.
  - `toString`: Renamed to `stringify()`.
  - `getIterator`: Renamed to `iterate()`.
  - `segmentLength`: Removed. Use the standard `.length` property.
  - `pop`: Removed as this was mutable. Use `max()` in combination with `init()`.
  - `shift`: Removed as this was mutable. Use `min()` in combination with `tail()`.

- Rewrote the `MultiRange` class to use the new function-style API under the hood. Use this only during migration because it defeats the benefits of version 5. Note that this is no longer exported as the default export, so you may need to change at least your `import` statements.
- Improved the performance of heavily fragmented ranges by using binary search.

## v4.0.9

- Removed unnecessary files from the package.
- Updated all devDependencies to latest.
- Migrated to GitHub Actions-based CI.

## v4.0.8

- Improved tsdoc comments.
- Updated dependencies.

## v4.0.7

- Improved the quality of tsdoc comments.
- Refactored test codes.
- Updated dependencies.

## v4.0.6

- Made the parser throw a `RangeError` if an integer in a string is too big or small (#10).

## v4.0.5

- Included CHANGELOG in the repository.
- Migrated test framework from Mocha to Jest.
- Updated dependencies.

## v4.0.4

- Only cosmetic changes and doc updates.

## v4.0.3

- Fixed a bug where the copy constructor did not correctly copy the source's parse options (#9)

## v4.0.2

- Fixed broken Runkit (tonic) example

## v4.0.1

- Removed `package-lock.json` from the release package

## v4.0.0

**❗️ Breaking Changes**

- The string parser no longer accepts unbounded and negative ranges by default. To parse strings possibly containing unbound/negative ranges (eg `10-`, `(-5)-0`), you need to manually pass an option to enable them.

  ```js
  const userInput = '-5, 10-15, 30, 45-';
  const pagesInMyDoc = [[1, 100]];
  const mr = new MultiRange(userInput, { parseUnbounded: true }).intersect(
    pagesInMyDoc
  );
  ```

  Note that this affects only the string parser. Array/number initializers always accept unbounded/negative ranges, just as before.

  ```
  const mr = new MultiRange([[-5, 3], [10, Inifinity]]); // This is always valid
  ```

**New**

- The constructor now takes an optional `options` parameter, with which you can modify the parsing strategy. See above.
- `MultiRange` is now exported also as the default export of the module. You can use `import MR from 'multi-integer-range'` instead of `import { MultiRange as MR } from 'multi-integer-range'`.
- Iterator shimming: The type of `Symbol.iterator` is no longer strictly checked using `typeof`. This means polyfilled symbols (using core-js or such) will enable `MultiRange.prototype[Symbol.iterator]`, and `for ... of` loops will correctly transpile to ES5 using Babel or TypeScript (>=2.3 with `--downlevelIteration`).
- Used ES2015 in the documentation.

## v3.0.0

**❗️ Breaking Changes**

- Removed the following methods which had been deprecated since v2.0.0.

  - `isContinuous()` (Gone for good. Use `segmentLength() === 1` instead)
  - `hasRange()` \*
  - `appendRange()` \*
  - `subtractRnage()` \*

  It's still possible to access some methods (marked with \*) unless you are using TypeScript (these methods were only turned to private methods). They will be there for the time being, although undocumented.

- (TypeScript) `*.d.ts` file included in the package is now ready for `--strictNullChecks`. This means TypeScript users need to update their compiler to v2.0 or later to use the definition file. (You do not necessarily have to enable `--strictNullChecks` flag. See #7 for details.)

**New**

- Added four convenient methods: `min()`, `max()`, `shift()`, and `pop()`

## v2.1.0

- Added support for unbounded (i.e., infinite) ranges.
- Added support for ranges containing zero and negative integers.
- Added isUnbounded() method.

**❗️ Background Compatibility**: Most existing code should work just fine, but strings which used to be errors are now considered valid. For example, `new MultiRange('2-')` and `new MultiRange('(-10)')` raised a SyntaxError until v2.0.0, but now these are valid ways to denote unbound and negative ranges, respectively. Those who passes arbitrary user input to the string parser may have to perform additional error checking. Use `#isUnbounded()` to check if an instance is unbounded (infinite). Or limiting the range using `#intersection()` should be enough for most cases.

## v2.0.0

- Dropped support for UMD. Now the module is compiled only as commonJS/node style module.
- Added `segmentLength()` method.
- Deprecated some methods, namely `addRange`, `subtractRange`, `hasRange`, `isContinuous`. These may be removed in future releases.

Existing codes which do not depend on the AMD module system should work fine without problems.

## v1.4.3

- Fixed compatibility issues for old browsers.

## v1.4.2

- Small performance improvements and documentation improvements.

## v1.4.0

- Add `intersect` method.
- Many methods and the constructor now have consistent signatures. Notably, it's now possible to create a MultiRange object using a single integer (new MultiRange(5)).

## v1.3.1

- `#has()` now accepts range strings. multirange('1-100').has('10-20') returns true.
- Optimized `#append()` so that appending integers to the end of the existing ranges will be faster.

## v1.3.0

- Exported a shorthand function `multirange`.

## v1.2.1

- Removed the use of `Array.prototype.forEach`. The library should work fine for very old runtime. (except for native iterators)
- Added `typings` field in `package.json`, so TypeScript compilers can locate the d.ts file (TS >= 1.6 required). Currently not working with iterators.
