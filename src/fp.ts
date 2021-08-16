/**
 * A `[min, max]` tuple to denote one integer range.
 */
export type Range = readonly [min: number, max: number];

/**
 * An immutable, normalized Range array.
 * Create this value using either `parse()` or `normalize()`.
 */
export type MultiIntegerRange = readonly Range[];

export type MIR = MultiIntegerRange; // shorthand

export type Options = {
  /**
   * Parses negative integers enclosed in parentheses.
   */
  readonly parseNegative?: boolean;
  /**
   * Parses unbounded ranges like `10-` or `-10`.
   */
  readonly parseUnbounded?: boolean;
};

/**
 * Parses a string and creates a new `MultiIntegerRange`.
 * This is the default parser, but you can create and use another parser
 * to suit your needs as long as it produces a normalized array of `Range`s.
 * @param data The string to parse.
 * @param options Modifies the parsing behavior.
 * @returns A new normalized MultiIntegerRange.
 * @example
 * parse('1-10'); //=> 1-10
 * parse(' 10-, 7', { parseUnbounded: true }); //=> 7,10-
 */
export const parse = (data: string, options?: Options): MIR => {
  const { parseNegative = false, parseUnbounded = false } = options || {};

  const toInt = (str: string): number => {
    const m = str.match(/^\(?(\-?\d+)/) as any;
    const int = parseInt(m[1], 10);
    if (int < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < int)
      throw new RangeError('The number is too big or too small.');
    return int;
  };

  const s = data.replace(/\s/g, '');
  if (!s.length) return [];

  const int = parseNegative ? '(\\d+|\\(\\-?\\d+\\))' : '(\\d+)';
  const intMatch = new RegExp('^' + int + '$');
  const rangeMatch = new RegExp('^' + int + '?\\-' + int + '?$');

  const unsorted: (Range | number)[] = [];
  for (const str of s.split(',')) {
    // TODO: Switch to String.matchAll()
    let match: RegExpMatchArray | null;
    if ((match = str.match(intMatch))) {
      const val = toInt(match[1]);
      unsorted.push(val);
    } else if ((match = str.match(rangeMatch))) {
      if (
        !parseUnbounded &&
        (match[1] === undefined || match[2] === undefined)
      ) {
        throw new SyntaxError('Unexpected unbouded range notation');
      }
      let min = match[1] === undefined ? -Infinity : toInt(match[1]);
      let max = match[2] === undefined ? +Infinity : toInt(match[2]);
      unsorted.push([min, max]);
    } else {
      throw new SyntaxError('Invalid input');
    }
  }
  return normalize(unsorted);
};

/**
 * Takes a number or an unsorted array of ranges,
 * and returns a new normalized MultiIntegerRange.
 * @param value A number or an unsorted array, e.g., `[[7, 5], 1]`.
 * @returns Normalized array, e.g., `[[1, 1], [5, 7]]`.
 * @example
 * normalize(5); //=> 5
 * normalize([1, 8]) //=> 1,8
 * normalize([[1, 8]]) //=> 1-8
 * normalize([[1, Infinity]]) //=> 1-
 */
export const normalize = (value: (number | Range)[] | number): MIR => {
  const result: Range[] = [];
  if (typeof value === 'number') return normalize([value]);
  for (const r of value) {
    let newRange: Range;
    if (typeof r === 'number') {
      newRange = [r, r];
    } else if (Array.isArray(r) && r.length === 2) {
      newRange = r[0] <= r[1] ? [r[0], r[1]] : [r[1], r[0]];
    } else {
      throw new TypeError('Unrecognized range member.');
    }
    if (
      (newRange[0] === Infinity && newRange[1] === Infinity) ||
      (newRange[0] === -Infinity && newRange[1] === -Infinity)
    ) {
      throw new RangeError(
        'Infinity can be used only within an unbounded range segment'
      );
    }
    const overlap = findOverlap(result, newRange);
    result.splice(overlap.lo, overlap.count, overlap.union);
  }
  return result;
};

/**
 * Calculates the union of two specified ranges.
 * @param a Range A.
 * @param b Range B.
 * @private
 * @returns Union of `a` and `b`.
 *   Returns `null` if `a` and `b` do not touch nor intersect.
 */
const calcUnion = (a: Range, b: Range): Range | null => {
  if (a[1] + 1 < b[0] || a[0] - 1 > b[1]) {
    return null; // cannot make union
  }
  return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
};

/**
 * Determines how the given range overlaps or touches the existing ranges.
 * This is a helper method that calculates how an append/subtract operation
 * affects the existing range members.
 * @param target The range array to test.
 * @returns An object containing information about how the given range
 * overlaps or touches this instance.
 */
const findOverlap = (
  data: MIR,
  target: Range
): {
  lo: number;
  count: number;
  union: Range;
} => {
  //   a        b  c     d         e  f       g h i   j k  l       m
  //--------------------------------------------------------------------
  //   |----(0)----|     |---(1)---|  |---(2)---|          |--(3)--|
  //            |------------(A)--------------|
  //                                            |-(B)-|
  //                                              |-(C)-|
  //
  // (0)-(3) represent the existing ranges (data),
  // and (A)-(C) are the ranges being passed to this function (target).
  //
  // A pseudocode findOverlap(A) returns { lo: 0, count: 3, union: <a-h> },
  // meaning (A) overlaps the 3 existing ranges from index 0.
  //
  // findOverlap(B) returns { lo: 2, count: 1, union: <f-j> },
  // meaning (B) "touches" one range element, (2).
  //
  // findOverlap(C) returns { lo: 3, count: 0, union: <i-k> }
  // meaning (C) is between (2) and (3) but overlaps/touches neither of them.

  const countOverlap = (lo: number) => {
    let count = 0,
      tmp: Range | null,
      union = target;
    while (
      lo + count < data.length &&
      (tmp = calcUnion(union, data[lo + count]))
    ) {
      union = tmp;
      count++;
    }
    return { lo, count, union };
  };

  const t0 = target[0];
  if (data.length > 0 && t0 < data[0][0] - 1) {
    return countOverlap(0);
  } else if (data.length > 0 && t0 > data[data.length - 1][1] + 1) {
    return { lo: data.length, count: 0, union: target };
  } else {
    // perform binary search
    let imin = 0,
      imax = data.length - 1;
    while (imax >= imin) {
      const imid = imin + Math.floor((imax - imin) / 2);
      if (
        (imid === 0 || t0 > data[imid - 1][1] + 1) &&
        t0 <= data[imid][1] + 1
      ) {
        return countOverlap(imid);
      } else if (data[imid][1] + 1 < t0) {
        imin = imid + 1;
      } else {
        imax = imid - 1;
      }
    }
    return { lo: 0, count: 0, union: target };
  }
};

/**
 * Appends two MultiIntegerRange's.
 * @param a The first value.
 * @param b The second value.
 * @example
 * append([[1, 5]], [[3, 8], [10, 15]]); //=> 1-8,10-15
 * append([[5, Infinity]], [[-Infinity, 2]]); //=> -2,5-
 */
export const append = (a: MIR, b: MIR): MIR => {
  let result = a.slice(0);
  for (let r of b) {
    const overlap = findOverlap(result, r);
    result.splice(overlap.lo, overlap.count, overlap.union);
  }
  return result;
};

/**
 * Subtracts the second value from the first value.
 * @param a The value to be subtracted.
 * @param b The value to subtract.
 * @example
 * subtract([[1, 7]], [[2, 4]]); //=> 1,5-7
 * subtract([[-Infinity, Infinity]], [[2, 4]]); //=> -1,5-
 */
export const subtract = (a: MIR, b: MIR): MIR => {
  let result = a.slice(0);
  for (let r of b) {
    const overlap = findOverlap(result, r);
    if (overlap.count > 0) {
      const remaining: Range[] = [];
      if (result[overlap.lo][0] < r[0]) {
        remaining.push([result[overlap.lo][0], r[0] - 1]);
      }
      if (r[1] < result[overlap.lo + overlap.count - 1][1]) {
        remaining.push([r[1] + 1, result[overlap.lo + overlap.count - 1][1]]);
      }
      result.splice(overlap.lo, overlap.count, ...remaining);
    }
  }
  return result;
};

/**
 * Calculates the intersection of the two MultiIntegerRange's.
 * @param a The first value.
 * @param b The second value.
 * @returns A new MultiIntegerRange containing all integers
 *   that belong to both `a` and `b`.
 * @example
 * intersect([[2, 5]], [[4, 9]]); //=> 4-5
 * intersect([[5, 10]], [[-Infinity, Infinity]]); //=> 5-10
 */
export const intersect = (a: MIR, b: MIR): MIR => {
  const result: Range[] = [];
  let jstart = 0; // used for optimization
  for (let i = 0; i < a.length; i++) {
    const r1 = a[i];
    for (let j = jstart; j < b.length; j++) {
      const r2 = b[j];
      if (r1[0] <= r2[1] && r1[1] >= r2[0]) {
        jstart = j;
        const min = Math.max(r1[0], r2[0]);
        const max = Math.min(r1[1], r2[1]);
        result.push([min, max]);
      } else if (r1[1] < r2[0]) {
        break;
      }
    }
  }
  return result;
};

/**
 * Checks if `a` contains or is equal to `b` (a ⊇ b).
 * @param a The value that possibly contains `b`.
 * @param b The value that is possibly contained by `a`.
 * @returns True if `b` is a subset of `a`.
 * @example
 * has([[0, 100]], [[2, 10]]) //=> true
 * has([[2, 10]], [[0, 100]]) //=> false
 */
export const has = (a: MIR, b: MIR): boolean => {
  const s = 0;
  const len = a.length;
  for (let r of b) {
    let i: number;
    for (i = s; i < len; i++) {
      const my = a[i];
      if (r[0] >= my[0] && r[1] <= my[1] && r[1] >= my[0] && r[1] <= my[1])
        break;
    }
    if (i === len) return false;
  }
  return true;
};

/**
 * Calculates how many integers are included in the given MultiIntegerRange.
 * @param data The value to calculate the length on.
 * @returns The number of integers contained in `data`. May be `Infinity`.
 * @example
 * length([[1, 3], [8, 10]]); //=> 6
 * length([[1, Infinity]]); //=> Infinity
 */
export const length = (data: MIR): number => {
  if (isUnbounded(data)) return Infinity;
  let result = 0;
  for (const r of data) result += r[1] - r[0] + 1;
  return result;
};

/**
 * Checks if the data contains an unbounded (aka inifinit) range.
 * @param data The value to check.
 * @returns True if `data` is unbounded.
 * @example
 * isUnbounded([[1, Infinity]]); //=> true
 */
export const isUnbounded = (data: MIR): boolean => {
  return (
    data.length > 0 &&
    (data[0][0] === -Infinity || data[data.length - 1][1] === Infinity)
  );
};

/**
 * Checks if the two values are the same.
 * @param a The first value to compare.
 * @param b The second value to compare.
 * @returns True if `a` and `b` have the same range data.
 * @example
 * equals([[1, 5], [7, 8]], [[1, 5], [7, 8]]); //=> true
 * equals([[1, 5]], [[2, 7]]); //=> false
 */
export const equals = (a: MIR, b: MIR): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
};

/**
 * Returns the minimum integer of the given MultiIntegerRange.
 * @param data The value.
 * @returns The minimum integer. May be `undefined` of `-Infinity`.
 * @example
 * min([[2, 5], [8, 10]]); //=> 2
 * min([[-Infinity, 0]]); //=> -Infinity
 * min([]); //=> undefined
 */
export const min = (data: MIR): number | undefined => {
  if (data.length === 0) return undefined;
  return data[0][0];
};

/**
 * Returns the maximum integer of the given MultiIntegerRange.
 * @param data The value.
 * @returns The minimum integer. May be `undefined` of `Infinity`.
 * @example
 * max([[2, 5], [8, 10]]); //=> 10
 * max([[3, Infinity]]); //=> Infinity
 * max([]); //=> undefined
 */
export const max = (data: MIR): number | undefined => {
  if (data.length === 0) return undefined;
  return data[data.length - 1][1];
};

/**
 * Returns all but the smallest integer.
 * @param data The value.
 * @returns The original value without its `min()` integer.
 * @example
 * tail([[2, 5], [8, 10]]); //=> 3-5,8-10
 */
export const tail = (data: MIR): MIR => {
  const m = min(data);
  if (m === -Infinity)
    throw new RangeError(
      'tail() was invoked on an unbounded MultiRange which contains -Infinity'
    );
  if (m === undefined) return data;
  return subtract(data, [[m, m]]);
};

/**
 * Returns all but the largest integer.
 * @param data The value.
 * @returns The original value without its `max()` integer.
 * @example
 * init([[2, 5], [8, 10]]; //=> 2-5,8-9
 */
export const init = (data: MIR): MIR => {
  const m = max(data);
  if (m === Infinity)
    throw new RangeError(
      'init() was invoked on an unbounded MultiRange which contains -Infinity'
    );
  if (m === undefined) return data;
  return subtract(data, [[m, m]]);
};

/**
 * Returns the string respresentation of the given MultiIntegerRange.
 * @param data The value to stringify.
 * @example
 * stringify([[3, 5], [7, Infinity]]); //=> '3-5,7-'
 */
export const stringify = (data: MIR): string => {
  const wrap = (i: number) => (i >= 0 ? String(i) : `(${i})`);
  const ranges: string[] = [];
  for (let r of data) {
    if (r[0] === -Infinity) {
      if (r[1] === Infinity) {
        ranges.push('-');
      } else {
        ranges.push(`-${wrap(r[1])}`);
      }
    } else if (r[1] === Infinity) {
      ranges.push(`${wrap(r[0])}-`);
    } else if (r[0] == r[1]) {
      ranges.push(wrap(r[0]));
    } else {
      ranges.push(`${wrap(r[0])}-${wrap(r[1])}`);
    }
  }
  return ranges.join(',');
};

/**
 * Builds a flattened array of integers.
 * Note that this may be slow and memory-consuming for large ranges.
 * Consider using the iterator whenever possible.
 * @param data The value to build an array on.
 * @example
 * flatten([[-1, 1], [7, 9]]); //=> [-1, 0, 1, 7, 8, 9]
 */
export const flatten = (data: MIR): number[] => {
  if (isUnbounded(data)) {
    throw new RangeError('You cannot build an array from an unbounded range');
  }
  const result = new Array(length(data));
  let idx = 0;
  for (let r of data) {
    for (let n = r[0]; n <= r[1]; n++) {
      result[idx++] = n;
    }
  }
  return result;
};

/**
 * Returns an Iterable with which you can use `for-of` or the spread syntax.
 * @param data The normalized MultiIntegerRange to iterate over.
 * @returns An Iterable object.
 * @example
 * Array.from(iterate([[1, 3], [7, 9]])); //=> [1, 2, 3, 7, 8, 9]
 */
export const iterate = (data: MIR): Iterable<number> => {
  if (isUnbounded(data)) {
    throw new RangeError('Unbounded ranges cannot be iterated over');
  }
  return {
    [Symbol.iterator]: () => {
      let i = 0,
        curRange: Range = data[i],
        j = curRange ? curRange[0] : undefined;
      return {
        next: () => {
          if (!curRange || j === undefined)
            return { done: true, value: undefined };
          const ret = j;
          if (++j > curRange[1]) {
            curRange = data[++i];
            j = curRange ? curRange[0] : undefined;
          }
          return { done: false, value: ret };
        }
      };
    }
  };
};
