import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiRange, Initializer, multirange } from './MultiRange.js';

const mr = (i?: Initializer) => {
  return multirange(i, { parseNegative: true, parseUnbounded: true });
};

const t = (mr: MultiRange, expected: any) => {
  assert.strictEqual(mr.toString(), expected);
};

test('constructor', async tc => {
  await tc.test('initialize with various types of initializer', () => {
    t(mr('10-8,7-5,1-4'), '1-10');
    t(mr(-8), '(-8)');
    t(mr([]), '');
    t(mr(), '');
    t(mr([-4, 5, [8, 10], [12, 15]]), '(-4),5,8-10,12-15');
    t(mr(mr('5-10')), '5-10'); // clone
    // @ts-expect-error
    assert.throws(() => mr(new Date()), TypeError);
    assert.throws(() => mr('2-5,8-10,*,99'), SyntaxError);
    assert.throws(() => mr('1-900719925474099100'), RangeError);
  });

  await tc.test('respect options', () => {
    assert.throws(() => multirange('(-5)-(-1)'), SyntaxError);
    assert.throws(
      () => multirange('(-5)-', { parseUnbounded: true }),
      SyntaxError
    );
    assert.throws(() => multirange('1-'), SyntaxError);
    assert.throws(
      () => multirange('-(-1)', { parseNegative: true }),
      SyntaxError
    );
  });

  await tc.test('copy constructor copies options', () => {
    const o1 = multirange('5-10', {
      parseNegative: true,
      parseUnbounded: true
    });
    const b1 = multirange(o1);
    assert.strictEqual(b1.append('-(-5)').toString(), '-(-5),5-10');

    const o2 = multirange('5-10');
    const b2 = multirange(o2);
    assert.throws(() => b2.append('-(-5)'), SyntaxError);

    // If another options is explicitly provided, respect it
    const b3 = multirange(o1, {});
    assert.throws(() => b3.append('-5'), SyntaxError);
    assert.throws(() => b3.append('(-1)'), SyntaxError);
  });
});

test('#clone', () => {
  const orig = mr('2-5');
  const clone = orig.clone();
  orig.append(6);
  clone.append(1);
  t(orig, '2-6');
  t(clone, '1-5');
});

test('#append', () => {
  t(
    mr('(-5)-(-3)').append([-6, -2, 4, 5, [100, Infinity]]),
    '(-6)-(-2),4-5,100-'
  );
  t(
    mr('1-50')
      .append(60)
      .append('70')
      .append(mr([80])),
    '1-50,60,70,80'
  );
});

test('#substract', () => {
  t(mr('(-10)-(-3),7-').subtract(-5), '(-10)-(-6),(-4)-(-3),7-');
  t(
    mr('1-50')
      .subtract(40)
      .subtract('30')
      .subtract(mr([20]))
      .subtract([[10, 10]]),
    '1-9,11-19,21-29,31-39,41-50'
  );
});

test('#intersect', () => {
  t(mr('30-50,60-80,90-120').intersect('45-65,75-90'), '45-50,60-65,75-80,90');
  t(mr('1-100').intersect('20-150').intersect('10-40'), '20-40');
});

test('#has', () => {
  assert.strictEqual(
    mr('5-20,25-100,150-300').has('5-20,25-100,150-300'),
    true
  );
  assert.strictEqual(
    mr('5-20,25-100,150-300').has([10, 20, 30, 40, 120]),
    false
  );
  // @ts-expect-error
  assert.throws(() => mr(5).has(), TypeError);
  assert.throws(() => multirange('1-10').has('(-5)'), SyntaxError);
});

test('#length', () => {
  assert.strictEqual(mr('1,3,10-15,20-21').length(), 10);
});

test('#segmentLength', () => {
  assert.strictEqual(mr('').segmentLength(), 0);
  assert.strictEqual(mr('1,3,10-15,20-21').segmentLength(), 4);
  assert.strictEqual(mr('-3,8-').segmentLength(), 2);
  assert.strictEqual(mr('-').segmentLength(), 1);
});

test('#equals', () => {
  assert.strictEqual(
    mr('(-7)-(-4),(-1)-3,5-').equals('(-7)-(-4),(-1)-3,5-'),
    true
  );
  assert.strictEqual(
    mr('2-8,10-12,15-20').equals('2-8,10-12,15-20,23-25'),
    false
  );
  // @ts-expect-error
  assert.throws(() => mr('').equals(), TypeError);
  assert.throws(() => multirange('1-10').equals('(-5)'), SyntaxError);
});

test('#isUnbounded', () => {
  assert.strictEqual(mr([[-Infinity, 5]]).isUnbounded(), true);
  assert.strictEqual(mr(8).isUnbounded(), false);
});

test('#min', () => {
  assert.strictEqual(mr('1,5,10-15').min(), 1);
  assert.strictEqual(mr('-1,5,10').min(), -Infinity);
  assert.strictEqual(mr('').min(), undefined);
});

test('#max', () => {
  assert.strictEqual(mr('1,5,10-15').max(), 15);
  assert.strictEqual(mr('1,5,10-').max(), Infinity);
  assert.strictEqual(mr('').max(), undefined);
});

test('#pop', () => {
  const r1 = mr('5,8-9');
  assert.strictEqual(r1.pop(), 9);
  assert.strictEqual(r1.pop(), 8);
  assert.strictEqual(r1.pop(), 5);
  assert.strictEqual(r1.pop(), undefined);
  assert.strictEqual(r1.pop(), undefined);
  assert.strictEqual(r1.segmentLength(), 0);

  const r2 = mr('-5,9');
  assert.strictEqual(r2.pop(), 9);
  assert.strictEqual(r2.pop(), 5);
  assert.strictEqual(r2.pop(), 4);
  assert.strictEqual(r2.pop(), 3);
  assert.strictEqual(r2.equals('-2'), true);

  assert.throws(() => mr('8-').pop(), RangeError);
});

test('#shift', () => {
  const r1 = mr('5,8-9');
  assert.strictEqual(r1.shift(), 5);
  assert.strictEqual(r1.shift(), 8);
  assert.strictEqual(r1.shift(), 9);
  assert.strictEqual(r1.shift(), undefined);
  assert.strictEqual(r1.shift(), undefined);
  assert.strictEqual(r1.segmentLength(), 0);

  const r2 = mr('5,9-');
  assert.strictEqual(r2.shift(), 5);
  assert.strictEqual(r2.shift(), 9);
  assert.strictEqual(r2.shift(), 10);
  assert.strictEqual(r2.shift(), 11);
  assert.strictEqual(r2.equals('12-'), true);

  assert.throws(() => mr('-8').shift(), RangeError);
});

test('#toString', () => {
  assert.strictEqual('' + mr('15-20'), '15-20');
  assert.strictEqual('' + mr([[10, Infinity]]), '10-');
});

test('#toArray', () => {
  assert.deepStrictEqual(mr('2-3,8,10-12').toArray(), [2, 3, 8, 10, 11, 12]);
  assert.throws(() => mr('-5').toArray(), RangeError);
});

test('#getRanges', () => {
  const a = mr('5,12-15');
  const ranges = a.getRanges();
  assert.deepStrictEqual(ranges, [
    [5, 5],
    [12, 15]
  ]);
  ranges[0][1] = 7;
  ranges[1][0] = 14;
  t(a, '5,12-15'); // ensure the internal range data is not changed
});

test('Iteration', () => {
  const testIter = (mr: MultiRange, expected: number[]) => {
    assert.deepStrictEqual(Array.from(mr), expected);
    const iter = mr.getIterator();
    const arr: number[] = [];
    let val;
    while (!(val = iter.next()).done) arr.push(val.value!);
    assert.deepStrictEqual(arr, expected);
  };
  testIter(mr(''), []);
  testIter(mr('(-8)-(-6),0,2-3'), [-8, -7, -6, 0, 2, 3]);
});
