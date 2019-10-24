/*! multi-integer-range (c) 2015 Soichiro Miki */

/**
 * A `[min, max]` tuple to denote one integer range.
 */
export type Range = [number, number];

export type Initializer = string | number | (number | Range)[] | MultiRange;

declare var Symbol: any;

export type Options = {
  /**
   * Parses negative integers enclosed in parentheses.
   */
  parseNegative?: boolean;
  /**
   * Parses unbounded ranges like `10-` or `-10`.
   */
  parseUnbounded?: boolean;
};

const defaultOptions: Options = { parseNegative: false, parseUnbounded: false };

const MAX_SAFE_INTEGER = 9007199254740991;
const MIN_SAFE_INTEGER = -9007199254740991;

/**
 * Parses and manipulates multiple integer ranges.
 */
export class MultiRange {
  private ranges: Range[];
  private options: Options;

  /**
   * Creates a new MultiRange object.
   */
  constructor(data?: Initializer, options: Options = defaultOptions) {
    function isArray(x: any): x is Array<any> {
      return Object.prototype.toString.call(x) === '[object Array]';
    }

    this.ranges = [];
    this.options = {
      parseNegative: !!options.parseNegative,
      parseUnbounded: !!options.parseUnbounded
    };

    if (typeof data === 'string') {
      this.parseString(data);
    } else if (typeof data === 'number') {
      this.appendRange(data, data);
    } else if (data instanceof MultiRange) {
      this.ranges = data.getRanges();
      if (arguments[1] === undefined) {
        this.options = {
          parseNegative: data.options.parseNegative,
          parseUnbounded: data.options.parseUnbounded
        };
      }
    } else if (isArray(data)) {
      for (let item of <(number | Range)[]>data) {
        if (isArray(item)) {
          if (item.length === 2) {
            this.appendRange(item[0], item[1]);
          } else {
            throw new TypeError('Invalid array initializer');
          }
        } else if (typeof item === 'number') {
          this.append(item);
        } else {
          throw new TypeError('Invalid array initialzer');
        }
      }
    } else if (data !== undefined) {
      throw new TypeError('Invalid input');
    }
  }

  /**
   * Parses the initializer string and build the range data.
   * Override this if you need to customize the parsing strategy.
   */
  protected parseString(data: string): void {
    function toInt(str: string): number {
      const m = str.match(/^\(?(\-?\d+)/) as any;
      const int = parseInt(m[1], 10);
      if (int < MIN_SAFE_INTEGER || MAX_SAFE_INTEGER < int)
        throw new RangeError('The number is too big or too small.');
      return int;
    }

    const s = data.replace(/\s/g, '');
    if (!s.length) return;
    let match;

    const int = this.options.parseNegative ? '(\\d+|\\(\\-?\\d+\\))' : '(\\d+)';
    const intMatch = new RegExp('^' + int + '$');
    const rangeMatch = new RegExp('^' + int + '?\\-' + int + '?$');

    for (let r of s.split(',')) {
      if ((match = r.match(intMatch))) {
        const val = toInt(match[1]);
        this.appendRange(val, val);
      } else if ((match = r.match(rangeMatch))) {
        if (
          !this.options.parseUnbounded &&
          (match[1] === undefined || match[2] === undefined)
        ) {
          throw new SyntaxError('Unexpected unbouded range notation');
        }
        const min = match[1] === undefined ? -Infinity : toInt(match[1]);
        const max = match[2] === undefined ? +Infinity : toInt(match[2]);
        this.appendRange(min, max);
      } else {
        throw new SyntaxError('Invalid input');
      }
    }
  }

  /**
   * Clones this instance.
   * @returns The cloned instance.
   */
  public clone(): MultiRange {
    return new MultiRange(this);
  }

  /**
   * Appends to this instance.
   * @param value The data to append.
   */
  public append(value: Initializer): MultiRange {
    if (value === undefined) {
      throw new TypeError('Invalid input');
    } else if (value instanceof MultiRange) {
      for (let r of value.ranges) this.appendRange(r[0], r[1]);
      return this;
    } else {
      return this.append(new MultiRange(value, this.options));
    }
  }

  /**
   * Appends a specified range of integers to this isntance.
   * @param min The minimum value of the range to append.
   * @param max The maximum value of the range to append.
   */
  private appendRange(min: number, max: number): MultiRange {
    let newRange: Range = [min, max];
    if (newRange[0] > newRange[1]) {
      newRange = [newRange[1], newRange[0]];
    }
    if (
      (newRange[0] === Infinity && newRange[1] === Infinity) ||
      (newRange[0] === -Infinity && newRange[1] === -Infinity)
    ) {
      throw new RangeError(
        'Infinity can be used only within an unbounded range segment'
      );
    }
    const overlap = this.findOverlap(newRange);
    this.ranges.splice(overlap.lo, overlap.count, overlap.union);
    return this;
  }

  /**
   * Subtracts from this instance.
   * @param value The data to subtract.
   */
  public subtract(value: Initializer): MultiRange {
    if (value === undefined) {
      throw new TypeError('Invalid input');
    } else if (value instanceof MultiRange) {
      for (let r of value.ranges) this.subtractRange(r[0], r[1]);
      return this;
    } else {
      return this.subtract(new MultiRange(value, this.options));
    }
  }

  /**
   * Subtracts a specified range of integers from this instance.
   * @param min The minimum value of the range to subtract.
   * @param max The maximum value of the range to subtract.
   */
  private subtractRange(min: number, max: number): MultiRange {
    let newRange: Range = [min, max];
    if (newRange[0] > newRange[1]) {
      newRange = [newRange[1], newRange[0]];
    }
    const overlap = this.findOverlap(newRange);
    if (overlap.count > 0) {
      const remain: Range[] = [];
      if (this.ranges[overlap.lo][0] < newRange[0]) {
        remain.push([this.ranges[overlap.lo][0], newRange[0] - 1]);
      }
      if (newRange[1] < this.ranges[overlap.lo + overlap.count - 1][1]) {
        remain.push([
          newRange[1] + 1,
          this.ranges[overlap.lo + overlap.count - 1][1]
        ]);
      }
      this.ranges.splice.apply(
        this.ranges,
        (<any>[overlap.lo, overlap.count]).concat(remain)
      );
    }
    return this;
  }

  /**
   * Remove integers which are not included in `value`,
   * yielding the intersection of this and `value`.
   * @param value The data to calculate the intersetion.
   */
  public intersect(value: Initializer): MultiRange {
    if (value === undefined) {
      throw new TypeError('Invalid input');
    } else if (value instanceof MultiRange) {
      const result: Range[] = [];
      let jstart = 0; // used for optimization
      for (let i = 0; i < this.ranges.length; i++) {
        const r1 = this.ranges[i];
        for (let j = jstart; j < value.ranges.length; j++) {
          const r2 = value.ranges[j];
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
      this.ranges = result;
      return this;
    } else {
      return this.intersect(new MultiRange(value, this.options));
    }
  }

  /**
   * Determines how the given range overlaps or touches the existing ranges.
   * This is a helper method that calculates how an append/subtract operation
   * affects the existing range members.
   * @param target The range array to test.
   * @returns An object containing information about how the given range
   * overlaps or touches this instance.
   */
  private findOverlap(
    target: Range
  ): { lo: number; count: number; union: Range } {
    //   a        b  c     d         e  f       g h i   j k  l       m
    //--------------------------------------------------------------------
    //   |----(0)----|     |---(1)---|  |---(2)---|          |--(3)--|
    //            |------------(A)--------------|
    //                                            |-(B)-|
    //                                              |-(C)-|
    //
    // (0)-(3) represent the existing ranges (this.ranges),
    // and (A)-(C) are the ranges being passed to this function.
    //
    // A pseudocode findOverlap(A) returns { lo: 0, count: 3, union: <a-h> },
    // meaning (A) overlaps the 3 existing ranges from index 0.
    //
    // findOverlap(B) returns { lo: 2, count: 1, union: <f-j> },
    // meaning (B) "touches" one range element, (2).
    //
    // findOverlap(C) returns { lo: 3, count: 0, union: <i-k> }
    // meaning (C) is between (2) and (3) but overlaps/touches neither of them.

    for (let hi = this.ranges.length - 1; hi >= 0; hi--) {
      const r = this.ranges[hi];
      let union;
      if ((union = this.calcUnion(r, target))) {
        let count = 1;
        let tmp;
        while (
          hi - count >= 0 &&
          (tmp = this.calcUnion(union, this.ranges[hi - count]))
        ) {
          union = tmp;
          count++;
        }
        // The given target touches/overlaps one or more of the existing ranges
        return { lo: hi + 1 - count, count, union };
      } else if (r[1] < target[0]) {
        // The given target does not touch nor overlap the existing ranges
        return { lo: hi + 1, count: 0, union: target };
      }
    }
    // The given target is smaller than the smallest existing range
    return { lo: 0, count: 0, union: target };
  }

  /**
   * Calculates the union of two specified ranges.
   * @param a Range A.
   * @param b Range B.
   * @returns Union of `a` and `b`.
   *   Returns `null` if `a` and `b` do not touch nor intersect.
   */
  private calcUnion(a: Range, b: Range): Range | null {
    if (a[1] + 1 < b[0] || a[0] - 1 > b[1]) {
      return null; // cannot make union
    }
    return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
  }

  /**
   * Exports the whole range data as an array of arrays.
   * @returns An copied array of range segments.
   */
  public getRanges(): Range[] {
    const result: Range[] = [];
    for (let r of this.ranges) result.push([r[0], r[1]]);
    return result;
  }

  /**
   * Checks if this instance contains the specified value.
   * @param value Value to be checked.
   * @returns True if the specified value is included in the instance.
   */
  public has(value: Initializer): boolean {
    if (value === undefined) {
      throw new TypeError('Invalid input');
    } else if (value instanceof MultiRange) {
      const s = 0;
      const len = this.ranges.length;
      for (let tr of value.ranges) {
        let i: number;
        for (i = s; i < len; i++) {
          let my = this.ranges[i];
          if (
            tr[0] >= my[0] &&
            tr[1] <= my[1] &&
            tr[1] >= my[0] &&
            tr[1] <= my[1]
          )
            break;
        }
        if (i === len) return false;
      }
      return true;
    } else {
      return this.has(new MultiRange(value, this.options));
    }
  }

  /**
   * Checks if this instance contains the range specified by the two parameters.
   * @param min The minimum value of the range to subtract.
   * @param max The minimum value of the range to subtract.
   * @returns True if the specified value is included in the instance.
   */
  private hasRange(min: number, max: number): boolean {
    return this.has(new MultiRange([[min, max]]));
  }

  /**
   * Returns the number of range segments.
   * For example, the segmentLength of `2-5,7,9-11` is 3.
   * @returns The number of segments. Returns 0 for an empty instance.
   */
  public segmentLength(): number {
    return this.ranges.length;
  }

  /**
   * Calculates how many numbers are effectively included in this instance.
   * For example, the length of `1-10,51-60,90` is 21.
   * @returns The number of integer values in this instance.
   *    Returns `Infinity` for an unbounded range.
   */
  public length(): number {
    if (this.isUnbounded()) return Infinity;
    let result = 0;
    for (let r of this.ranges) result += r[1] - r[0] + 1;
    return result;
  }

  /**
   * Checks if two instances of MultiRange are identical.
   * @param cmp The data to compare.
   * @returns True if `cmp` is exactly the same as this instance.
   */
  public equals(cmp: Initializer): boolean {
    if (cmp === undefined) {
      throw new TypeError('Invalid input');
    } else if (cmp instanceof MultiRange) {
      if (cmp === this) return true;
      if (this.ranges.length !== cmp.ranges.length) return false;
      for (let i = 0; i < this.ranges.length; i++) {
        if (
          this.ranges[i][0] !== cmp.ranges[i][0] ||
          this.ranges[i][1] !== cmp.ranges[i][1]
        )
          return false;
      }
      return true;
    } else {
      return this.equals(new MultiRange(cmp, this.options));
    }
  }

  /**
   * Checks if the current instance is unbounded (i.e., infinite).
   */
  public isUnbounded(): boolean {
    return (
      this.ranges.length > 0 &&
      (this.ranges[0][0] === -Infinity ||
        this.ranges[this.ranges.length - 1][1] === Infinity)
    );
  }

  /**
   * Returns the minimum integer contained in this insntance.
   * Can be -Infinity or undefined.
   * @returns The minimum integer of this instance.
   */
  public min(): number | undefined {
    if (this.ranges.length === 0) return undefined;
    return this.ranges[0][0];
  }

  /**
   * Returns the maximum number contained in this insntance.
   * Can be Infinity or undefined.
   * @returns The maximum integer of this instance.
   */
  public max(): number | undefined {
    if (this.ranges.length === 0) return undefined;
    return this.ranges[this.ranges.length - 1][1];
  }

  /**
   * Removes the smallest integer from this instance and returns it.
   * @returns The minimum integer removed from this instance.
   */
  public shift(): number | undefined {
    const min = this.min();
    if (min === -Infinity)
      throw new RangeError(
        'shift() was invoked on an unbounded MultiRange which contains -Infinity'
      );
    if (min !== undefined) this.subtract(min);
    return min;
  }

  /**
   * Removes the largest integer from this instance and returns it.
   * @returns The maximum integer removed from this instance.
   */
  public pop(): number | undefined {
    const max = this.max();
    if (max === Infinity)
      throw new RangeError(
        'pop() was invoked on an unbounded MultiRange which contains +Infinity'
      );
    if (max !== undefined) this.subtract(max);
    return max;
  }

  /**
   * Returns the string respresentation of this MultiRange.
   */
  public toString(): string {
    function wrap(i: number): string {
      return i >= 0 ? String(i) : `(${i})`;
    }
    const ranges: string[] = [];
    for (let r of this.ranges) {
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
  }

  /**
   * Builds a flat array of integers which holds all elements in this instance.
   * Note that this may be slow and memory-consuming for large ranges.
   * Consider using the iterator whenever possible.
   */
  public toArray(): number[] {
    if (this.isUnbounded()) {
      throw new RangeError('You cannot build an array from an unbounded range');
    }
    const result = new Array(this.length());
    let idx = 0;
    for (let r of this.ranges) {
      for (let n = r[0]; n <= r[1]; n++) {
        result[idx++] = n;
      }
    }
    return result;
  }

  /**
   * Returns an ES6-compatible iterator.
   */
  public getIterator(): { next: () => { done?: boolean; value?: number } } {
    if (this.isUnbounded()) {
      throw new RangeError('Unbounded ranges cannot be iterated over');
    }
    let i = 0,
      curRange: Range = this.ranges[i],
      j = curRange ? curRange[0] : undefined;
    return {
      next: () => {
        if (!curRange || j === undefined) return { done: true };
        const ret = j;
        if (++j > curRange[1]) {
          curRange = this.ranges[++i];
          j = curRange ? curRange[0] : undefined;
        }
        return { value: ret };
      }
    };
  }
}

export default MultiRange;

// Set ES6 iterator, if Symbol.iterator is defined
/* istanbul ignore else */
if (typeof Symbol === 'function' && 'iterator' in Symbol) {
  MultiRange.prototype[Symbol.iterator] = MultiRange.prototype.getIterator;
}

/**
 * A shorthand function to construct a new MultiRange instance.
 * @returns The new MultiRnage instance.
 */
export function multirange(data?: Initializer, options?: Options): MultiRange {
  return new MultiRange(data, options);
}
