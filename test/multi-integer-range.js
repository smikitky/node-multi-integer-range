var multi_integer_range = require('../lib/multi-integer-range');
var MultiRange = multi_integer_range.MultiRange;
var multirange = multi_integer_range.multirange;
var assert = require('chai').assert;

describe('MultiRange', function() {
	function mr(i) {
		return multirange(i, { parseNegative: true, parseUnbounded: true });
	}

	var mrd = multirange;

	function t(mr, expected) {
		assert.strictEqual(mr.toString(), expected);
	}

	describe('constructor', function() {
		it('must initialize with a string', function() {
			t(mr(''), '');
			t(mr('5'), '5');
			t(mr('0'), '0');
			t(mr('(-5)'), '(-5)');
			t(mr('1-3,5,7-10'), '1-3,5,7-10');
			t(mr('(-10)-(-7),(-5),(-3)-(-1)'), '(-10)-(-7),(-5),(-3)-(-1)');
			t(mr('1 -3,  5,\t7-10\n'), '1-3,5,7-10');
		});

		it('must throw if parseNegative is turned off', function() {
			assert.throws(function() { mrd('(-1)'); }, SyntaxError);
			assert.throws(function() { mrd('(-5)-(-1)'); }, SyntaxError);
			assert.throws(
				function() { mrd('(-5)-', { parseUnbounded: true }); },
				SyntaxError
			);
		});

		it('must throw if parseUnbounded is turned off', function() {
			assert.throws(function() { mrd('1-'); }, SyntaxError);
			assert.throws(function() { mrd('-'); }, SyntaxError);
			assert.throws(function() { mrd('-1'); }, SyntaxError);
			assert.throws(
				function() { mrd('-(-1)', { parseNegative: true }); },
				SyntaxError
			);
		});

		it('must parse unbounded ranges', function() {
			t(mr('10-'), '10-');
			t(mr('-10'), '-10');
			t(mr('5,10-'), '5,10-');
			t(mr('-10,20,50'), '-10,20,50');
		});

		it('must parse string with random/reverse order', function() {
			t(mr('1,8,2-4,7,5-6,10-9'), '1-10');
			t(mr('10-8,7-5,1-4'), '1-10');
			t(mr('8-10,(-5),0,7,(-1)-(-4),1-6'), '(-5)-10');
		});

		it('must initialize with a single integer', function() {
			t(mr(2), '2');
			t(mr(0), '0');
			t(mr(-8), '(-8)');
		});

		it('must initialize with an array', function() {
			t(mr([]), '');
			t(mr([1,10,8,-5,9]), '(-5),1,8-10');
			t(mr([[2,5],[7,10]]), '2-5,7-10');
			t(mr([[-7,1],[3,9]]), '(-7)-1,3-9');
			t(mr([5,[8,10],[12,15]]), '5,8-10,12-15');
		});

		it('must construct with existing MultiRange', function() {
			t(mr(mr('5-10')), '5-10'); // aka clone
		});

		it('must copy the options when using copy constructor', function() {
			var original = mrd('5-10', { parseNegative: true });

			var b = mrd(original);
			assert.isTrue(b.options.parseNegative);
			assert.isFalse(b.options.parseUnbounded);

			// If another options is explicitly provided, respect it
			var c = mrd(original, { parseNegative: false, parseUnbounded: true });
			assert.isFalse(c.options.parseNegative);
			assert.isTrue(c.options.parseUnbounded);
		});

		it('must throw an error for invalid input', function() {
			assert.throws(function() { mr('abc'); }, SyntaxError);
			assert.throws(function() { mr('1.5'); }, SyntaxError);
			assert.throws(function() { mr('2-5,8-10,*,99'); }, SyntaxError);
			assert.throws(function() { mr(','); }, SyntaxError);
			assert.throws(function() { mr(['abc']); }, TypeError);
			assert.throws(function() { mr([1,[5,9,7]]); }, TypeError);
			assert.throws(function() { mr(null); }, TypeError);
			// followings are valid
			assert.doesNotThrow(function() { mr(undefined); }, Error);
			t(mr(undefined), '');
			assert.doesNotThrow(function() { mr([]); }, Error);
			t(mr([]), '');
			assert.doesNotThrow(function() { mr(); }, Error);
			t(mr(), '');
			assert.doesNotThrow(function() { mr(''); }, Error);
			t(mr(''), '');
		});

		it('must throw an error for Infinity not as part of an unbounded range segment', function() {
			assert.throws(function() { mr(Infinity); }, RangeError);
			assert.throws(function() { mr([Infinity]); }, RangeError);
			assert.throws(function() { mr([[Infinity, Infinity]]); }, RangeError);
			assert.throws(function() { mr(-Infinity); }, RangeError);
			assert.throws(function() { mr([-Infinity]); }, RangeError);
			assert.throws(function() { mr([[-Infinity, -Infinity]]); }, RangeError);
		});
	});

	it('#clone', function() {
		var orig = mr('2-5');
		var clone = orig.clone();
		orig.append(6);
		clone.append(1);
		t(orig, '2-6');
		t(clone, '1-5');
	});

	describe('#append', function() {
		it('must append values correctly', function() {
			t(mr('5-10').append(5), '5-10');
			t(mr('5-10').append(8), '5-10');
			t(mr('5-10').append(10), '5-10');
			t(mr('5-10').append(11), '5-11');
			t(mr('5-10').append(4), '4-10');
			t(mr('5-10').append(15), '5-10,15');
			t(mr('5-10').append(1), '1,5-10');
			t(mr('5-10,15-20').append(12), '5-10,12,15-20');
			t(mr('5-10,15-20').append(3), '3,5-10,15-20');
			t(mr('5-10,15-20').append(25), '5-10,15-20,25');
			t(mr('1-10,12-15,17-20').append(11), '1-15,17-20');
			t(mr('1-10,12-15,17-20').append([[1,100]]), '1-100');
			t(mr('1-10,12-15,17-20,100').append([[5,14]]), '1-15,17-20,100');
			t(mr('1-10,12-15,17-20').append([[14,19]]), '1-10,12-20');
		});
		it('must append negative values correctly', function() {
			t(mr('(-5)-(-3)').append([-6, -2, 4, 5]), '(-6)-(-2),4-5');
			t(mr('(-5)-(-3)').append(3), '(-5)-(-3),3');
			t(mr('(-5)-(-3)').append([[-8, -1], [3, 9]]), '(-8)-(-1),3-9');
			t(mr('(-5)-(-3),(-10)-(-8),0-6').append([-6, -7, [-2, -1]]), '(-10)-6');
		});
		it('must append unbounded ranges correctly', function() {
			t(mr('5-').append(10), '5-');
			t(mr('5-').append(4), '4-');
			t(mr('5-').append(3), '3,5-');
			t(mr('5-').append('10-'), '5-');
			t(mr('5-').append('2-'), '2-');
			t(mr('-5').append(10), '-5,10');
			t(mr('-5').append(6), '-6');
			t(mr('-5').append(2), '-5');
			t(mr('-5').append('-10'), '-10');
			t(mr('-5').append('-2'), '-5');
			t(mr('-5').append('3-'), '-');
			t(mr('-5').append('6-'), '-');
			t(mr('-5,8-').append('1-10'), '-');
			t(mr('-3').append('5-'), '-3,5-');
			t(mr('-(-10)').append('(-8),0,10-'), '-(-10),(-8),0,10-');
			t(mr('-(-10)').append('(-8),0,10-'), '-(-10),(-8),0,10-');
			t(mr('-').append('(-8),0,10-'), '-');
			t(mr('-').append('-'), '-');
			t(mr().append('-'), '-');
		});
		it('must accept various input types', function() {
			t(mr('5-10,15-20').append(12), '5-10,12,15-20');
			t(mr('5-10,15-20').append('11-14,21-25'), '5-25');
			t(mr('5-10,15-20').append([12]), '5-10,12,15-20');
			t(mr('5-10,15-20').append([[12, 13]]), '5-10,12-13,15-20');
			t(mr('5-10,15-20').append(mr('11-14,21-25')), '5-25');
		});
		it('must throw an exception for empty call', function() {
			assert.throws(function() { mr(5).append(); }, TypeError);
		});
		it('must be chainable', function() {
			t(mr('1-50').append(60).append('70').append(mr([80])).appendRange(90,90),
				'1-50,60,70,80,90');
		});
		it('must pass options correctly', function() {
			assert.throws(function() {
				mrd('1', { parseNegative: false }).append(3).append('(-5)');
			}, SyntaxError);
			assert.throws(function() {
				mrd('1', { parseUnbounded: false }).append(3).append('3-');
			}, SyntaxError);
		});
	});

	describe('#substract', function() {
		it('must subtract values correctly', function() {
			t(mr('1-10').subtract(100), '1-10');
			t(mr('1-10').subtract(0), '1-10');
			t(mr('1-10').subtract(11), '1-10');
			t(mr('1-10').subtract(1), '2-10');
			t(mr('1-10').subtract(10), '1-9');
			t(mr('1-10').subtractRange(1, 10), '');
			t(mr('1-10').subtractRange(5, 8), '1-4,9-10');
			t(mr('1-10').subtractRange(8, 5), '1-4,9-10');
			t(mr('1-10,20-30').subtractRange(11, 19), '1-10,20-30');
			t(mr('1-10,20-30').subtractRange(5, 25), '1-4,26-30');
		});
		it('must subtract negative values correctly', function() {
			t(mr('(-10)-(-3)').subtract(5), '(-10)-(-3)');
			t(mr('(-10)-(-3)').subtract(-10), '(-9)-(-3)');
			t(mr('(-10)-(-3)').subtract(-3), '(-10)-(-4)');
			t(mr('(-10)-(-3)').subtract(-5), '(-10)-(-6),(-4)-(-3)');
			t(mr('(-30),(-20)-(-10),(-8)-0,8').subtract([-20, [-12, -5]]), '(-30),(-19)-(-13),(-4)-0,8');
		});
		it('must subtract unbounded ranges correctly', function() {
			t(mr('10-20').subtract('15-'), '10-14');
			t(mr('10-20').subtract('-15'), '16-20');
			t(mr('10-20').subtract('-12,18-'), '13-17');
			t(mr('-12,18-').subtract('5'), '-4,6-12,18-');
			t(mr('-12,18-').subtract('5,20'), '-4,6-12,18-19,21-');
			t(mr('-12,18-').subtract('-20,3-'), '');
			t(mr('-12,18-').subtract('-'), '');
			t(mr('-').subtract('200-205'), '-199,206-');
			t(mr('-').subtract('-100,150-'), '101-149');
			t(mr('-').subtract('-100,120,130,150-'), '101-119,121-129,131-149');
			t(mr('-').subtract('-'), '');
		});
		it('must accept various input types', function() {
			t(mr('1-20').subtract(5), '1-4,6-20');
			t(mr('1-20').subtract('5,10-15'), '1-4,6-9,16-20');
			t(mr('1-20').subtract([5,10,15]), '1-4,6-9,11-14,16-20');
			t(mr('1-20').subtract([[5,10]]), '1-4,11-20');
			t(mr('1-20').subtract(mr('5,10-15')), '1-4,6-9,16-20');
		});
		it('must throw an exception for empty call', function() {
			assert.throws(function() { mr(5).subtract(); }, TypeError);
		});
		it('must be chainable', function() {
			t(mr('1-50').subtract(40).subtract('30').subtract(mr([20])).subtractRange(10,10),
				'1-9,11-19,21-29,31-39,41-50');
		});
		it('must pass options correctly', function() {
			assert.throws(function() {
				mrd('1-10', { parseNegative: false }).subtract(3).subtract('(-5)');
			}, SyntaxError);
			assert.throws(function() {
				mrd('1-10', { parseUnbounded: false }).subtract(3).subtract('3-');
			}, SyntaxError);
		});
	});

	describe('#intersect', function() {

		// the result must remain consistent when operands are swapped
		function t2(r1, r2, expected) {
			t(mr(r1).intersect(r2), expected);
			t(mr(r2).intersect(r1), expected);
		}

		it('must calculate intersections correctly', function() {
			t2('1-5', '8', '');
			t2('5-100', '1,10,50,70,80,90,100,101', '10,50,70,80,90,100');
			t2('5-100', '1-10,90-110', '5-10,90-100');
			t2('30-50,60-80,90-120', '45-65,75-90', '45-50,60-65,75-80,90');
			t2('10,12,14,16,18,20', '11,13,15,17,19,21', '');
			t2('10,12,14,16,18,20', '10,12,14,16,18,20', '10,12,14,16,18,20');
			t2('10-12,14-16,18-20', '11,13,15,17,19,21', '11,15,19');
			t2('10-12,14-16,18-20', '10-12,14-16,18-20', '10-12,14-16,18-20');
			t2('10-12,14-16,18-20', '20-22,24-26,28-30', '20');
		});
		it('must calculate negative intersections correctly', function() {
			t2('0', '0', '0');
			t2('(-50)-50', '(-30)-30', '(-30)-30');
			t2('(-50)-50', '5-30', '5-30');
			t2('(-50)-50', '(-100)-(-20)', '(-50)-(-20)');
			t2('(-20)-(-18),(-16)-(-14),(-12)-(-10)', '1-50', '');
			t2('(-20)-(-18),(-16)-(-14),(-12)-(-10)', '(-19)-(-12)', '(-19)-(-18),(-16)-(-14),(-12)');
		});
		it('must calculate unbounded range intersections correctly', function() {
			t2('1-', '4-', '4-');
			t2('100-', '-300', '100-300');
			t2('-5', '-0', '-0');
			t2('-10,50,90-', '0-100', '0-10,50,90-100');
			t2('-40,70,80-', '-50,70,90-', '-40,70,90-');
			t2('-10', '80-', '');
			t2('-', '-', '-');
			t2('-', '-90', '-90');
			t2('-', '80-', '80-');
			t2('-', '40-45,(-20)', '(-20),40-45');
		});
		it('must accept various input types', function() {
			t(mr('10-15').intersect(12), '12');
			t(mr('10-15').intersect('12-17'), '12-15');
			t(mr('10-15').intersect([12,15,17]), '12,15');
			t(mr('10-15').intersect([[12,17]]), '12-15');
			t(mr('10-15').intersect(mr('12-17')), '12-15');
		});
		it('must throw an exception for empty call', function() {
			assert.throws(function() { mr(5).intersect(); }, TypeError);
		});
		it('must be chainable', function() {
			t(mr('1-100').intersect('20-150').intersect('10-40'), '20-40');
		});
		it('must pass options correctly', function() {
			assert.throws(function() {
				mrd('1-10', { parseNegative: false }).intersect(5).intersect('(-5)');
			}, SyntaxError);
			assert.throws(function() {
				mrd('1-10', { parseUnbounded: false }).intersect(5).intersect('3-');
			}, SyntaxError);
		});
	});

	describe('#has', function() {
		it('must perform correct inclusion check', function() {
			assert.isTrue(mr('5-20,25-100,150-300').has('7'));
			assert.isTrue(mr('5-20,25-100,150-300').has('25'));
			assert.isTrue(mr('5-20,25-100,150-300').has('300'));
			assert.isTrue(mr('5-20,25-100,150-300').has('5-10'));
			assert.isTrue(mr('5-20,25-100,150-300').has('5-10,25'));
			assert.isTrue(mr('5-20,25-100,150-300').has('25-40,160'));
			assert.isTrue(mr('5-20,25-100,150-300').has('5-20,25-100,150-300'));
			assert.isTrue(mr('5-20,25-100,150-300').has('5,80,18-7,280,100,15-20,25,200-250'));
			assert.isTrue(mr('5-20,25-100,150-300').has(''));

			assert.isTrue(mr('(-300)-(-200),(-50)-(-30),20-25').has('(-40),(-250)-(-280)'));
			assert.isTrue(mr('(-300)-(-200),(-50)-(-30),20-25').has('(-200)-(-250),(-280)-(-220)'));

			assert.isFalse(mr('5-20,25-100,150-300').has('3'));
			assert.isFalse(mr('5-20,25-100,150-300').has('22'));
			assert.isFalse(mr('5-20,25-100,150-300').has('500'));
			assert.isFalse(mr('5-20,25-100,150-300').has('10-21'));
			assert.isFalse(mr('5-20,25-100,150-300').has('149-400'));
			assert.isFalse(mr('5-20,25-100,150-300').has('5-20,25-103,150-300'));
			assert.isFalse(mr('5-20,25-100,150-300').has('5,80,18-7,280,100,15-20,25,200-250,301'));

			assert.isFalse(mr('(-300)-(-200),(-50)-(-30),20-25').has('(-40),(-100)'));
		});
		it('must perform correct inclusion check for unbounded ranges', function() {
			assert.isTrue(mr('-').has('5'));
			assert.isTrue(mr('-20,40-').has('70'));
			assert.isTrue(mr('-20,40').has('10'));
			assert.isTrue(mr('-20,30-35,40-').has('-10,30,31,50-'));
			assert.isTrue(mr('-').has('-'));
			assert.isFalse(mr('-20,40-').has('30'));
			assert.isFalse(mr('-20,40-').has('10-50'));
			assert.isFalse(mr('-20,40-').has('10-'));
			assert.isFalse(mr('-20,40-').has('-50'));
			assert.isFalse(mr('-20,40-').has('-'));
		});
		it('must accept various input types', function() {
			assert.isTrue(mr('5-20,25-100,150-300').has(30));
			assert.isFalse(mr('5-20,25-100,150-300').has(23));
			assert.isTrue(mr('5-20,25-100,150-300').has('30'));
			assert.isFalse(mr('5-20,25-100,150-300').has('23'));
			assert.isTrue(mr('5-20,25-100,150-300').has([10,20,30,40]));
			assert.isFalse(mr('5-20,25-100,150-300').has([10,20,30,40,120]));
			assert.isTrue(mr('5-20,25-100,150-300').has([[10,20],[30,50]]));
			assert.isFalse(mr('5-20,25-100,150-300').has([[10,20],[21,25],[30,50]]));
			assert.isTrue(mr('5-20,25-100,150-300').has(mr('30')));
			assert.isFalse(mr('5-20,25-100,150-300').has(mr('23')));
		});
		it('must throw an exception for empty call', function() {
			assert.throws(function() { mr(5).has(); }, TypeError);
		});
		it('must pass options correctly', function() {
			assert.throws(function() {
				mrd('1', { parseNegative: false }).has('(-5)');
			}, SyntaxError);
			assert.throws(function() {
				mrd('1', { parseUnbounded: false }).has('3-');
			}, SyntaxError);
		});
	});

	it('#hasRange', function() {
		assert.isTrue(mr('5-20,25-100,150-300').hasRange(5,15));
		assert.isFalse(mr('5-20,25-100,150-300').hasRange(3,10));
	});

	it('#length', function() {
		assert.equal(mr('').length(), 0);
		assert.equal(mr('5').length(), 1);
		assert.equal(mr('5-10').length(), 6);
		assert.equal(mr('1,3,10-15,20-21').length(), 10);
		assert.equal(mr('(-7)-(-4),(-1)-3,5').length(), 10);
		assert.equal(mr('-5').length(), Infinity);
		assert.equal(mr('8-').length(), Infinity);
		assert.equal(mr('-').length(), Infinity);
	});

	it('#segmentLength', function() {
		assert.equal(mr('').segmentLength(), 0);
		assert.equal(mr('5').segmentLength(), 1);
		assert.equal(mr('5-10').segmentLength(), 1);
		assert.equal(mr('1,3,10-15,20-21').segmentLength(), 4);
		assert.equal(mr('(-7)-(-4),(-1)-3,5').segmentLength(), 3);
		assert.equal(mr('-3,8-').segmentLength(), 2);
		assert.equal(mr('-').segmentLength(), 1);
	});

	it('#equals', function() {
		var foo = multirange('4,8,10-12');
		assert.isTrue(foo.equals(foo));

		assert.isTrue(mr('').equals(''));
		assert.isTrue(mr('5').equals(mr('5')));
		assert.isTrue(mr('2-8').equals('2-8'));
		assert.isTrue(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20'));
		assert.isTrue(mr('(-7)-(-4),(-1)-3,5').equals('(-7)-(-4),(-1)-3,5'));
		assert.isTrue(mr('-8,20-').equals('-8,20-'));
		assert.isTrue(mr('-').equals('1-,-0'));
		assert.isFalse(mr('').equals('5'));
		assert.isFalse(mr('5').equals('5-6'));
		assert.isFalse(mr('2-8').equals('2-7'));
		assert.isFalse(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20,23-25'));

		assert.throws(function() { mr('').equals() }, TypeError);

		assert.throws(function() {
			mrd('1-10', { parseNegative: false }).equals('(-5)');
		}, SyntaxError);
	});

	it('#isUnbounded', function() {
		assert.isTrue(mr([[-Infinity, 5]]).isUnbounded());
		assert.isTrue(mr([[0, 5], [10, Infinity]]).isUnbounded());
		assert.isFalse(mr(8).isUnbounded());
	});

	it('#min', function() {
		assert.strictEqual(mr('1,5,10-15').min(), 1);
		assert.strictEqual(mr('-1,5,10').min(), -Infinity);
		assert.strictEqual(mr().min(), undefined);
	});

	it('#max', function() {
		assert.strictEqual(mr('1,5,10-15').max(), 15);
		assert.strictEqual(mr('1,5,10-').max(), Infinity);
		assert.strictEqual(mr().max(), undefined);
	});

	it('#pop', function() {
		var r = mr('5,8-9');
		assert.strictEqual(r.pop(), 9);
		assert.strictEqual(r.pop(), 8);
		assert.strictEqual(r.pop(), 5);
		assert.strictEqual(r.pop(), undefined);
		assert.strictEqual(r.pop(), undefined);
		assert.strictEqual(r.segmentLength(), 0);

		r = mr('-5,9');
		assert.strictEqual(r.pop(), 9);
		assert.strictEqual(r.pop(), 5);
		assert.strictEqual(r.pop(), 4);
		assert.strictEqual(r.pop(), 3);
		assert.isTrue(r.equals('-2'));

		assert.throws(function() { mr('8-').pop(); }, RangeError);
	});

	it('#shift', function() {
		var r = mr('5,8-9');
		assert.strictEqual(r.shift(), 5);
		assert.strictEqual(r.shift(), 8);
		assert.strictEqual(r.shift(), 9);
		assert.strictEqual(r.shift(), undefined);
		assert.strictEqual(r.shift(), undefined);
		assert.strictEqual(r.segmentLength(), 0);

		r = mr('5,9-');
		assert.strictEqual(r.shift(), 5);
		assert.strictEqual(r.shift(), 9);
		assert.strictEqual(r.shift(), 10);
		assert.strictEqual(r.shift(), 11);
		assert.isTrue(r.equals('12-'));

		assert.throws(function() { mr('-8').shift(); }, RangeError);
	});

	it('#toString', function() {
		assert.equal('' + mr('15-20'), '15-20');
		assert.equal('' + mr('0'), '0');
		assert.equal('' + mr('(-8)-(-5)'), '(-8)-(-5)');
		assert.equal('' + mr([[-Infinity, Infinity]]), '-');
		assert.equal('' + mr([[-Infinity, 10]]), '-10');
		assert.equal('' + mr([[10, Infinity]]), '10-');
		assert.strictEqual('' + mr(), '');
	});

	describe('#toArray', function() {
		it('must build an array from a finite multirange', function() {
			assert.deepEqual(mr('').toArray(), []);
			assert.deepEqual(mr('2').toArray(), [2]);
			assert.deepEqual(mr('2-5').toArray(), [2,3,4,5]);
			assert.deepEqual(mr('2-3,8,10-12').toArray(), [2,3,8,10,11,12]);
			assert.deepEqual(mr('(-8)-(-6),0,2-3').toArray(), [-8,-7,-6,0,2,3]);
		});
		it('must throw an error for an infinite multirange', function() {
			assert.throws(function() { mr('-5').toArray() }, RangeError);
			assert.throws(function() { mr('-').toArray() }, RangeError);
		});
	});

	describe('Iteration', function() {
		it('#getIterator', function() {
			function testIter(mr, expected) {
				var it = mr.getIterator();
				var i = 0;
				var val = it.next();
				while (!val.done) {
					assert.equal(val.value, expected[i++], 'iterator returned unexpected value');
					val = it.next();
				}
				assert.equal(i, expected.length, 'iterator returned less elements than expected	');
			}
			testIter(mr(''), []);
			testIter(mr('8'), [8]);
			testIter(mr('2-5'), [2,3,4,5]);
			testIter(mr('2-5,8-10'), [2,3,4,5,8,9,10]);
			testIter(mr('(-8)-(-6),0,2-3'), [-8,-7,-6,0,2,3]);
		});

		it('must throw an error for unbounded ranges', function() {
			assert.throws(function() {
				mr([[8, Infinity]]).getIterator();
			}, RangeError);
		});

		if (typeof Symbol.iterator !== 'symbol') {
			it.skip('ES6 iterator');
			return;
		}

		it('ES6 iterator', function() {
			function testIter(mr, expected) {
				var i = 0;
				for (var item of mr) {
					assert.equal(item, expected[i++]);
				}
				assert.equal(i, expected.length);
			}
			testIter(mr(''), []);
			testIter(mr('8'), [8]);
			testIter(mr('2-5'), [2,3,4,5]);
			testIter(mr('2-5,8-10'), [2,3,4,5,8,9,10]);
			testIter(mr('(-8)-(-6),0,2-3'), [-8,-7,-6,0,2,3]);
		});

	});

	it('must not change the internal data after getRanges()', function() {
		var a = mr('5,12-15,100');
		var ranges = a.getRanges();
		ranges[0][1] = 7;
		ranges[1][0] = 14;
		t(a, '5,12-15,100');
	});
});


// the followings are meta tests to check our assertion methods
// handle Inifinite numbers consistently across various runtimes
describe('Assertion', function() {
	it('must perform comparison on inifite numbers', function() {
		assert.isTrue(Infinity === Infinity);
		assert.isTrue(-Infinity === -Infinity);
		assert.isTrue(10000000 < Infinity && -Infinity < -10000000);
		assert.equal(Infinity, Infinity);
		assert.equal(-Infinity, -Infinity);
		assert.deepEqual(
			[3, Number.POSITIVE_INFINITY, 5, Number.NEGATIVE_INFINITY],
			[3, Number.POSITIVE_INFINITY, 5, Number.NEGATIVE_INFINITY]
		);
	});
});
