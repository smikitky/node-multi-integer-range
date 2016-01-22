var multi_integer_range = require('../lib/multi-integer-range');
var MultiRange = multi_integer_range.MultiRange;
var multirange = multi_integer_range.multirange;
var assert = require('chai').assert;

describe('MultiRange', function() {
	var mr = multirange;

	function t(mr, expected) {
		assert.strictEqual(mr.toString(), expected);
	}

	describe('constructor', function() {
		it('must initialize with a string', function() {
			t(mr(''), '');
			t(mr('5'), '5');
			t(mr('1-3,5,7-10'), '1-3,5,7-10');
			t(mr('1 -3,  5,\t7-10\n'), '1-3,5,7-10');
		});

		it('must parse string with random/reverse order', function() {
			t(mr('1,8,2-4,7,5-6,10-9'), '1-10');
			t(mr('10-8,7-5,1-4'), '1-10');
		});

		it('must initialize with a single integer', function() {
			t(mr(2), '2');
		});

		it('must initialize with an array', function() {
			t(mr([]), '');
			t(mr([1,10,8,5,9]), '1,5,8-10');
			t(mr([[2,5],[7,10]]), '2-5,7-10');

			// Mixed array like this is not recommended nor explicitly
			// documented, but it works
			t(mr([5,[8,10],[12,15]]), '5,8-10,12-15');
		});

		it('must construct with existing MultiRange', function() {
			t(mr(mr('5-10')), '5-10'); // aka clone
		});

		it('must throw an error for invalid input', function() {
			assert.throws(function() { mr('abc'); }, SyntaxError);
			assert.throws(function() { mr('1.5'); }, SyntaxError);
			assert.throws(function() { mr('2-5,8-10,*,99'); }, SyntaxError);
			assert.throws(function() { mr(','); }, SyntaxError);
			assert.throws(function() { mr('-'); }, SyntaxError);
			assert.throws(function() { mr(['abc']); }, TypeError);
			assert.throws(function() { mr([1,[5,9,7]]); }, TypeError);
			assert.throws(function() { mr(null); }, TypeError);
			// followings are valid
			assert.doesNotThrow(function() { mr(undefined); }, Error);
			assert.doesNotThrow(function() { mr([]); }, Error);
			assert.doesNotThrow(function() { mr(); }, Error);
			assert.doesNotThrow(function() { mr(''); }, Error);
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
		it('must append by number', function() {
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
		});
		it('must append range resulting in concatenation', function() {
			t(mr('1-10,12-15,17-20').append(11), '1-15,17-20');
			t(mr('1-10,12-15,17-20').appendRange(1,100), '1-100');
			t(mr('1-10,12-15,17-20,100').appendRange(5,14), '1-15,17-20,100');
			t(mr('1-10,12-15,17-20').appendRange(14,19), '1-10,12-20');
		});
		it('must append using string', function() {
			t(mr('5-10,15-20').append('11-14,21-25'), '5-25');
		});
		it('must append using another MultiRange', function() {
			t(mr('5-10,15-20').append(mr('11-14,21-25')), '5-25');
		});
		it('must be chainable', function() {
			t(mr('1-50').append(60).append('70').append(mr([80])).appendRange(90,90),
				'1-50,60,70,80,90');
		});
	});

	describe('#substract', function() {
		it('must subtract a value', function() {
			t(mr('1-10').subtract(100), '1-10');
			t(mr('1-10').subtract(0), '1-10');
			t(mr('1-10').subtract(11), '1-10');
			t(mr('1-10').subtract(1), '2-10');
			t(mr('1-10').subtract(10), '1-9');
		});
		it('must subtract range resulting in devision', function() {
			t(mr('1-10').subtractRange(1, 10), '');
			t(mr('1-10').subtractRange(5, 8), '1-4,9-10');
			t(mr('1-10,20-30').subtractRange(11, 19), '1-10,20-30');
			t(mr('1-10,20-30').subtractRange(5, 25), '1-4,26-30');
		});
		it('must subtract using string', function() {
			t(mr('1-20').subtract('5,10-15'), '1-4,6-9,16-20');
		});
		it('must subtract using another MultiRange', function() {
			t(mr('1-20').subtract(new mr('5,10-15')), '1-4,6-9,16-20');
		});
		it('must be chainable', function() {
			t(mr('1-50').subtract(40).subtract('30').subtract(mr([20])).subtractRange(10,10),
				'1-9,11-19,21-29,31-39,41-50');
		});
	});

	describe('#intersect', function() {
		it('must accept various input types', function() {
			t(mr('10-15').intersect(12), '12');
			t(mr('10-15').intersect('12-17'), '12-15');
			t(mr('10-15').intersect(mr('12-17')), '12-15');
			t(mr('10-15').intersect(mr([[12,17]])), '12-15');
			t(mr('10-15').intersect(mr([12,15,17])), '12,15');
		});
		it('must calculate intersections correctly', function() {
			// the result must remain consistent when operands are swapped
			function t2(r1, r2, expected) {
				t(mr(r1).intersect(r2), expected);
				t(mr(r2).intersect(r1), expected);
			}
			t2('1-5', '8', '');
			t2('30-50,60-80,90-120', '45-65,75-90', '45-50,60-65,75-80,90');
			t2('10,12,14,16,18,20', '11,13,15,17,19,21', '');
			t2('10,12,14,16,18,20', '10,12,14,16,18,20', '10,12,14,16,18,20');
			t2('10-12,14-16,18-20', '11,13,15,17,19,21', '11,15,19');
			t2('10-12,14-16,18-20', '10-12,14-16,18-20', '10-12,14-16,18-20');
			t2('10-12,14-16,18-20', '20-22,24-26,28-30', '20');
		});
		it('must be chainable', function() {
			t(mr('1-100').intersect('20-150').intersect('10-40'), '20-40');
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

			assert.isFalse(mr('5-20,25-100,150-300').has('3'));
			assert.isFalse(mr('5-20,25-100,150-300').has('22'));
			assert.isFalse(mr('5-20,25-100,150-300').has('500'));
			assert.isFalse(mr('5-20,25-100,150-300').has('10-21'));
			assert.isFalse(mr('5-20,25-100,150-300').has('149-400'));
			assert.isFalse(mr('5-20,25-100,150-300').has('5-20,25-103,150-300'));
			assert.isFalse(mr('5-20,25-100,150-300').has('5,80,18-7,280,100,15-20,25,200-250,301'));
		});
		it('must accept various parameters', function() {
			assert.isTrue(mr('5-20,25-100,150-300').has(30));
			assert.isFalse(mr('5-20,25-100,150-300').has(23));
			assert.isTrue(mr('5-20,25-100,150-300').has([10,20,30,40]));
			assert.isFalse(mr('5-20,25-100,150-300').has([10,20,30,40,120]));
			assert.isTrue(mr('5-20,25-100,150-300').has([[10,20],[30,50]]));
			assert.isFalse(mr('5-20,25-100,150-300').has([[10,20],[21,25],[30,50]]));
			assert.isTrue(mr('5-20,25-100,150-300').has(mr('30')));
			assert.isFalse(mr('5-20,25-100,150-300').has(mr('23')));
		});
	});

	it('#hasRange', function() {
		assert.isTrue(mr('5-20,25-100,150-300').hasRange(5,15));
		assert.isFalse(mr('5-20,25-100,150-300').hasRange(3,10));
	});

	it('#isContinuous', function() {
		assert.isTrue(mr('1').isContinuous());
		assert.isTrue(mr('5-10').isContinuous());
		assert.isFalse(mr('').isContinuous());
		assert.isFalse(mr('5-10,12-15').isContinuous());
	});

	it('#length', function() {
		assert.equal(mr('').length(), 0);
		assert.equal(mr('5').length(), 1);
		assert.equal(mr('5-10').length(), 6);
		assert.equal(mr('1,3,10-15,20-21').length(), 10);
	});

	it('#equals', function() {
		assert.isTrue(mr('').equals(''));
		assert.isTrue(mr('5').equals(mr('5')));
		assert.isTrue(mr('2-8').equals('2-8'));
		assert.isTrue(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20'));
		assert.isFalse(mr('').equals('5'));
		assert.isFalse(mr('5').equals('5-6'));
		assert.isFalse(mr('2-8').equals('2-7'));
		assert.isFalse(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20,23-25'));
	});

	it('#toString', function() {
		assert.equal('' + mr('15-20'), '15-20');
	});

	it('#toArray', function() {
		assert.deepEqual(mr('').toArray(), []);
		assert.deepEqual(mr('2').toArray(), [2]);
		assert.deepEqual(mr('2-5').toArray(), [2,3,4,5]);
		assert.deepEqual(mr('2-3,8,10-12').toArray(), [2,3,8,10,11,12]);
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
