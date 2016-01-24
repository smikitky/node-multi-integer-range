/*! multi-integer-range (c) 2015 Soichiro Miki */

export type Range = [number, number];

export type Initializer = string | number | (number|Range)[] | MultiRange;

declare var Symbol: any;

export class MultiRange {
	private ranges: Range[];

	/**
	 * Creates a new MultiRange object.
	 */
	constructor(data?: Initializer) {
		this.ranges = [];
		if (typeof data === 'string') {
			this.parseString(data);
		} else if (typeof data === 'number') {
			this.ranges.push([data, data]);
		} else if (data instanceof MultiRange) {
			this.ranges = data.getRanges();
		} else if (Array.isArray(data)) {
			for (let item of <(number|Range)[]>data) {
				if (Array.isArray(item)) {
					if (item.length === 2) {
						this.appendRange(item[0], item[1]);
					} else {
						throw new TypeError('Invalid array initializer');
					}
				} else if (typeof item === 'number'){
					this.append(item);
				} else {
					throw new TypeError('Invalid array initialzer');
				}
			}
		} else if (typeof data !== 'undefined') {
			throw new TypeError('Invalid input');
		}
	}

	/**
	 * Parses the initialize string and build the range data.
	 * Override this if you need to customize the parsing strategy.
	 */
	protected parseString(data: string): void {
		let s = data.replace(/\s/g, '');
		if (s.length === 0) return;
		for (let r of s.split(',')) {
			let match = r.match(/^(\d+)(\-(\d+))?$/);
			if (match) {
				let min = parseInt(match[1]);
				let max = typeof match[3] !== 'undefined' ? parseInt(match[3]) : min;
				this.appendRange(min, max);
			} else {
				throw new SyntaxError('Invalid input');
			}
		};
	}

	/**
	 * Clones this instance.
	 */
	public clone(): MultiRange {
		return new MultiRange(this);
	}

	/**
	 * Appends to this instance.
	 * @parasm value The data to append.
	 */
	public append(value: Initializer): MultiRange {
		if (typeof value === 'undefined') {
			throw new TypeError('Invalid input');
		} else if (value instanceof MultiRange) {
			for (let r of value.ranges) this.appendRange(r[0], r[1]);
			return this;
		} else {
			return this.append(new MultiRange(value));
		}
	}

	/**
	 * Appends a specified range of integers to this isntance.
	 * @param min The minimum value of the range to append.
	 * @param max The minimum value of the range to append.
	 */
	public appendRange(min: number, max: number): MultiRange {
		let newRange: Range = [Math.max(0, min), max];
		if (newRange[0] > newRange[1]) {
			newRange = [newRange[1], newRange[0]];
		}
		let overlap = this.findOverlap(newRange);
		this.ranges.splice(overlap.lo, overlap.count, overlap.union);
		return this;
	}

	/**
	 * Subtracts from this instance.
	 * @param value The data to subtract.
	 */
	public subtract(value: Initializer): MultiRange {
		if (typeof value === 'undefined') {
			throw new TypeError('Invalid input');
		} else if (value instanceof MultiRange) {
			for (let r of value.ranges) this.subtractRange(r[0], r[1]);
			return this;
		} else {
			return this.subtract(new MultiRange(value));
		}
	}

	/**
	 * Subtracts a specified range of integers from this instance.
	 * @param min The minimum value of the range to subtract.
	 * @param max The minimum value of the range to subtract.
	 */
	public subtractRange(min: number, max: number): MultiRange
	{
		let newRange: Range = [Math.max(0, min), max];
		if (newRange[0] > newRange[1]) {
			newRange = [newRange[1], newRange[0]];
		}
		let overlap = this.findOverlap(newRange);
		if (overlap.count > 0) {
			let remain = [];
			if (this.ranges[overlap.lo][0] < newRange[0]) {
				remain.push([this.ranges[overlap.lo][0], newRange[0] - 1]);
			}
			if (newRange[1] < this.ranges[overlap.lo + overlap.count - 1][1]) {
				remain.push([newRange[1] + 1, this.ranges[overlap.lo + overlap.count - 1][1]]);
			}
			this.ranges.splice(overlap.lo, overlap.count, ... remain);
		}
		return this;
	}

	/**
	 * Remove integers which are not included in the given ranges (aka intersection).
	 * @param value The data to calculate the intersetion.
	 */
	public intersect(value: Initializer): MultiRange {
		if (typeof value === 'undefined') {
			throw new TypeError('Invalid input');
		} else if (value instanceof MultiRange) {
		 	let result = [];
			let jstart = 0; // used for optimization
			for (let i = 0; i < this.ranges.length; i++) {
				let r1 = this.ranges[i];
				for (let j = jstart; j < value.ranges.length; j++) {
					let r2 = value.ranges[j];
					if (r1[0] <= r2[1] && r1[1] >= r2[0]) {
							jstart = j;
							let min = Math.max(r1[0], r2[0]);
							let max = Math.min(r1[1], r2[1]);
							result.push([min, max]);
					} else if (r1[1] < r2[0]) {
						break;
					}
				}
			}
			this.ranges = result;
			return this;
		} else {
			return this.intersect(new MultiRange(value));
		}
	}

	/**
	 * Determines how the given range overlaps or touches the existing ranges.
	 * This is a helper method that calculates how an append/subtract operation
	 * affects the existing range members.
	 * @param target The range array to test.
	 * @return An object containing information about how the given range
	 * overlaps or touches this instance.
	 */
	private findOverlap(target: Range): { lo: number; count: number; union: Range }
	{
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
			let r = this.ranges[hi];
			let union;
			if (union = this.calcUnion(r, target)) {
				let count = 1;
				let tmp;
				while ((hi - count >= 0) && (tmp = this.calcUnion(union, this.ranges[hi - count]))) {
					union = tmp;
					count++;
				}
				// The given target touches or overlaps one or more of the existing ranges
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
	 * @param a Range A
	 * @param b Range B
	 * @return Union of a and b. Null if a and b do not touch nor intersect.
	 */
	private calcUnion(a: Range, b: Range): Range
	{
		if (a[1] + 1 < b[0] || a[0] - 1 > b[1]) {
			return null; // cannot make union
		}
		return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
	}

	/**
	 * Exports the whole range data as an array of arrays.
	 */
	public getRanges(): Range[]
	{
		let result = []
		for (let r of this.ranges) result.push(<Range>[r[0], r[1]]);
		return result;
	}

	/**
	 * Checks if the instance contains the specified value.
	 * @param value Value to be checked
	 * @return True if the specified value is included in the instance.
	 */
	public has(value: Initializer): boolean
	{
		if (typeof value === 'undefined') {
			throw new TypeError('Invalid input');
		} else if (value instanceof MultiRange) {
			let s = 0;
			let len = this.ranges.length;
			for (let tr of value.ranges) {
				let i: number;
				for (i = s; i < len; i++) {
					let my = this.ranges[i];
					if (tr[0] >= my[0] && tr[1] <= my[1] && tr[1] >= my[0] && tr[1] <= my[1]) break;
				}
				if (i === len) return false;
			}
			return true;
		} else {
			return this.has(new MultiRange(value));
		}
	}

	/**
	 * Checks if the instance contains the range specified by the two parameters.
	 * @param min The minimum value of the range to subtract.
	 * @param max The minimum value of the range to subtract.
	 * @return True if the specified value is included in the instance.
	 */
	public hasRange(min: number, max: number): boolean
	{
		return this.has(new MultiRange([[min, max]]));
	}

	/**
	 * Checks if the current instance is continuous.
	 * Note that this returns false if the current range is empty.
	 * @return True if the current range is continuous.
	 */
	public isContinuous(): boolean
	{
		return this.ranges.length === 1;
	}

	/**
	 * Calculates how many numbers are effectively included in this instance.
	 * (i.e. '1-10,51-60,90' returns 21)
	 * @return The number of integer values in this instance.
	 */
	public length(): number {
		let result = 0;
		for (let r of this.ranges) result += r[1] - r[0] + 1;
		return result;
	}

	/**
	 * Checks if two instances of MultiRange are identical.
	 * @param cmp The data to compare.
	 * @return True if cmp is exactly the same as this instance.
	 */
	public equals(cmp: Initializer): boolean
	{
		if (typeof cmp === 'undefined') {
			throw new TypeError('Invalid input');
		} else if (cmp instanceof MultiRange) {
			if (cmp === this) return true;
			if (this.ranges.length !== cmp.ranges.length) return false;
			for (let i = 0; i < this.ranges.length; i++) {
				if (this.ranges[i][0] !== cmp.ranges[i][0] || this.ranges[i][1] !== cmp.ranges[i][1])
					return false;
			}
			return true;
		} else {
			return this.equals(new MultiRange(cmp));
		}
	}

	/**
	 * Returns the string respresentation of this MultiRange.
	 */
	public toString(): string
	{
		let ranges = [];
		for (let r of this.ranges)
			ranges.push(r[0] == r[1] ? String(r[0]) : r[0] + '-' + r[1]);
		return ranges.join(',');
	}

	/**
	 * Builds an array of integer which holds all elements in this MultiRange.
	 * Note that this may be slow and memory-consuming for large ranges such as '1-10000'.
	 */
	public toArray(): number[]
	{
		let result = new Array(this.length());
		let idx = 0;
		for (let r of this.ranges) {
			for (let n = r[0]; n <= r[1]; n++) {
				result[idx++] = n;
			}
		}
		return result;
	}

	/**
	 * Returns ES6-compatible iterator.
	 */
	public getIterator(): { next: () => { done: boolean, value: number }}
	{
		let i = 0,
			curRange: Range = this.ranges[i],
			j = curRange ? curRange[0] : undefined;
		return {
			next: () => {
				if (!curRange) return { done: true, value: undefined };
				let ret = j;
				if (++j > curRange[1]) {
					curRange = this.ranges[++i];
					j = curRange ? curRange[0] : undefined;
				}
				return { done: false, value: ret };
			}
		}
	}

}

// Set ES6 iterator, if Symbol.iterator is defined
if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
	MultiRange.prototype[Symbol.iterator] = MultiRange.prototype.getIterator;
}

// A shorthand function to get a new MultiRange instance
export function multirange(data: string | number[] | MultiRange): MultiRange {
	return new MultiRange(data);
}
