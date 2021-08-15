import * as mr from './fp';

export type Initializer = string | number | (number | mr.Range)[] | MultiRange;

/**
 * Parses and manipulates multiple integer ranges.
 * This class exists for compatibility purposes.
 * Prefer the function style API instead.
 */
export class MultiRange {
  private ranges: mr.MultiIntegerRange;
  private options: mr.Options;

  /**
   * Creates a new MultiRange object.
   */
  constructor(data?: Initializer, options?: mr.Options) {
    this.ranges = [];
    this.options = {
      parseNegative: !!(options || {}).parseNegative,
      parseUnbounded: !!(options || {}).parseUnbounded
    };

    if (typeof data === 'string') {
      this.ranges = mr.parse(data, options);
    } else if (typeof data === 'number' || Array.isArray(data)) {
      this.ranges = mr.normalize(data);
    } else if (data instanceof MultiRange) {
      this.ranges = data.ranges;
      if (options === undefined) this.options = data.options;
    } else if (data !== undefined) {
      throw new TypeError('Invalid input');
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
    this.ranges = mr.append(
      this.ranges,
      new MultiRange(value, this.options).ranges
    );
    return this;
  }

  /**
   * Subtracts from this instance.
   * @param value The data to subtract.
   */
  public subtract(value: Initializer): MultiRange {
    this.ranges = mr.subtract(
      this.ranges,
      new MultiRange(value, this.options).ranges
    );
    return this;
  }

  /**
   * Remove integers which are not included in `value`,
   * yielding the intersection of this and `value`.
   * @param value The data to calculate the intersetion.
   */
  public intersect(value: Initializer): MultiRange {
    this.ranges = mr.intersect(
      this.ranges,
      new MultiRange(value, this.options).ranges
    );
    return this;
  }

  /**
   * Exports the whole range data as an array of arrays.
   * @returns An copied array of range segments.
   */
  public getRanges(): number[][] {
    const result: number[][] = [];
    for (let r of this.ranges) result.push([r[0], r[1]]);
    return result;
  }

  /**
   * Checks if this instance contains the specified value.
   * @param value Value to be checked.
   * @returns True if the specified value is included in the instance.
   */
  public has(value: Initializer): boolean {
    if (value === undefined) throw new TypeError('Invalid input');
    return mr.has(this.ranges, new MultiRange(value, this.options).ranges);
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
    return mr.length(this.ranges);
  }

  /**
   * Checks if two instances of MultiRange are identical.
   * @param cmp The data to compare.
   * @returns True if `cmp` is exactly the same as this instance.
   */
  public equals(cmp: Initializer): boolean {
    if (cmp === undefined) throw new TypeError('Invalid input');
    return mr.equals(this.ranges, new MultiRange(cmp, this.options).ranges);
  }

  /**
   * Checks if the current instance is unbounded (i.e., infinite).
   */
  public isUnbounded(): boolean {
    return mr.isUnbounded(this.ranges);
  }

  /**
   * Returns the minimum integer contained in this insntance.
   * Can be -Infinity or undefined.
   * @returns The minimum integer of this instance.
   */
  public min(): number | undefined {
    return mr.min(this.ranges);
  }

  /**
   * Returns the maximum number contained in this insntance.
   * Can be Infinity or undefined.
   * @returns The maximum integer of this instance.
   */
  public max(): number | undefined {
    return mr.max(this.ranges);
  }

  /**
   * Removes the smallest integer from this instance and returns it.
   * @returns The minimum integer removed from this instance.
   */
  public shift(): number | undefined {
    const min = this.min();
    this.ranges = mr.tail(this.ranges);
    return min;
  }

  /**
   * Removes the largest integer from this instance and returns it.
   * @returns The maximum integer removed from this instance.
   */
  public pop(): number | undefined {
    const max = this.max();
    this.ranges = mr.init(this.ranges);
    return max;
  }

  /**
   * Returns the string respresentation of this MultiRange.
   */
  public toString(): string {
    return mr.stringify(this.ranges);
  }

  /**
   * Builds a flat array of integers which holds all elements in this instance.
   * Note that this may be slow and memory-consuming for large ranges.
   * Consider using the iterator whenever possible.
   */
  public toArray(): number[] {
    return mr.flatten(this.ranges);
  }

  /**
   * Returns an ES6-compatible iterator.
   */
  public getIterator(): { next: () => { done?: boolean; value?: number } } {
    return mr.iterate(this.ranges)[Symbol.iterator]();
  }

  public [Symbol.iterator]() {
    return mr.iterate(this.ranges)[Symbol.iterator]();
  }
}

export const multirange = (data?: Initializer, options?: mr.Options) =>
  new MultiRange(data, options);
