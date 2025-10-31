import assert from 'node:assert/strict';
import test from 'node:test';
import * as mr from './fp.js';
import type { MIR, Range } from './fp.js';

test('parse', t => {
  t.test('no option', () => {
    assert.deepEqual(mr.parse(''), []);
    assert.deepEqual(mr.parse('0'), [[0, 0]]);
    assert.deepEqual(mr.parse('1-3,5,7-10'), [
      [1, 3],
      [5, 5],
      [7, 10]
    ]);
    assert.throws(() => mr.parse('5-'), SyntaxError);
    assert.throws(() => mr.parse('(-10)'), SyntaxError);
  });

  t.test('parse negative', () => {
    assert.deepEqual(mr.parse('(-5)', { parseNegative: true }), [[-5, -5]]);
    assert.deepEqual(
      mr.parse('(-10)-(-7),(-5),(-3)-(-1)', { parseNegative: true }),
      [
        [-10, -7],
        [-5, -5],
        [-3, -1]
      ]
    );
  });

  t.test('parse unbounded', () => {
    assert.deepEqual(mr.parse('10-', { parseUnbounded: true }), [
      [10, Infinity]
    ]);
    assert.deepEqual(mr.parse('-5', { parseUnbounded: true }), [
      [-Infinity, 5]
    ]);
    assert.deepEqual(mr.parse('-5,10-', { parseUnbounded: true }), [
      [-Infinity, 5],
      [10, Infinity]
    ]);
  });

  t.test('strip spaces', () => {
    assert.deepEqual(mr.parse('1 -3,  5,\t7-10\n'), [
      [1, 3],
      [5, 5],
      [7, 10]
    ]);
  });

  t.test('normalize', () => {
    assert.deepEqual(mr.parse('1,8,2-4,7,5-6,10-9'), [[1, 10]]);
    assert.deepEqual(mr.parse('10-8,7-5,1-4'), [[1, 10]]);
    assert.deepEqual(parseAll('8-10,(-5),100-, 0,7,(-1)-(-4),1-6'), [
      [-5, 10],
      [100, Infinity]
    ]);
  });

  t.test('throw SyntaxError for invalid input', () => {
    assert.throws(() => mr.parse('abc'), SyntaxError);
    assert.throws(() => mr.parse('1.5'), SyntaxError);
    assert.throws(() => mr.parse('2-5,8-10,*,99'), SyntaxError);
    assert.throws(() => mr.parse('2,,5'), SyntaxError);
    assert.throws(() => mr.parse(','), SyntaxError);
    // @ts-expect-error
    assert.throws(() => mr.parse(), TypeError);
    assert.doesNotThrow(() => mr.parse(''));
  });

  t.test('throw RangeError for huge integer strings', () => {
    assert.throws(() => mr.parse('1-900719925474099100'), RangeError);
    assert.throws(() => parseAll('(-900719925474099100)'), RangeError);
  });
});

// prettier-ignore
test('normalize', () => {
  const t = (a: Parameters<typeof mr.normalize>[0], expected: Range[]) =>
    assert.deepEqual(mr.normalize(a), expected);

  t([[7, 5], 1], [[1, 1], [5, 7]]);
  t([3, 1, [5, 7], [0, -3]], [[-3, 1], [3, 3], [5, 7]]);
  t(5, [[5, 5]]);
  t([[1, Infinity], [-Infinity, 0]], [[-Infinity, Infinity]]);
  t([], []);
  t(undefined, []);
  // @ts-expect-error
  assert.throws(() => mr.normalize([[1]]), TypeError);
  // @ts-expect-error
  assert.throws(() => mr.normalize([[2, 8, 3]]), TypeError);
  // @ts-expect-error
  assert.throws(() => mr.normalize(['str']), TypeError);
  assert.throws(() => mr.normalize([[Infinity, Infinity]]), RangeError);
  assert.throws(() => mr.normalize([[-Infinity, -Infinity]]), RangeError);
  assert.throws(() => mr.normalize([Infinity]), RangeError);
  assert.throws(() => mr.normalize(Infinity), RangeError);
});

test('initialize', () => {
  const t = (a: Parameters<typeof mr.initialize>[0], expected: Range[]) =>
    assert.deepEqual(mr.initialize(a), expected);
  t('5-10', [[5, 10]]);
  t([[9, 2]], [[2, 9]]);
  t('', []);
  t([], []);
  t(undefined, []);
});

const parseAll = (a: string) =>
  mr.parse(a, { parseNegative: true, parseUnbounded: true });

const makeT1 =
  <T, R>(
    testFunc: (data: MIR) => T,
    resultFilter: (result: T) => R = i => i as unknown as R
  ) =>
  (data: string, expected: R) => {
    assert.strictEqual(resultFilter(testFunc(parseAll(data))), expected);
  };

const makeT2 =
  <T, R>(
    testFunc: (a: MIR, b: MIR) => T,
    resultFilter: (result: T) => R = i => i as unknown as R,
    swappable?: boolean
  ) =>
  (a: string, b: string, expected: R) => {
    assert.strictEqual(
      resultFilter(testFunc(parseAll(a), parseAll(b))),
      expected
    );
    if (swappable) {
      assert.strictEqual(
        resultFilter(testFunc(parseAll(b), parseAll(a))),
        expected
      );
    }
  };

test('append', t => {
  const t2 = makeT2(mr.append, mr.stringify, true);

  t.test('positive', () => {
    t2('5-10', '5', '5-10');
    t2('5-10', '8', '5-10');
    t2('5-10', '10', '5-10');
    t2('5-10', '11', '5-11');
    t2('5-10', '4', '4-10');
    t2('5-10', '15', '5-10,15');
    t2('5-10', '1', '1,5-10');
    t2('5-10,15-20', '12', '5-10,12,15-20');
    t2('5-10,15-20', '3', '3,5-10,15-20');
    t2('5-10,15-20', '25', '5-10,15-20,25');
    t2('1-10,12-15,17-20', '11', '1-15,17-20');
    t2('1-10,12-15,17-20', '1-100', '1-100');
    t2('1-10,12-15,17-20,100', '5-14', '1-15,17-20,100');
    t2('1-10,12-15,17-20', '14-19', '1-10,12-20');
    t2('1,8,10', '2-3,4-5,6,7,9', '1-10');
  });

  t.test('negative', () => {
    t2('(-5)-(-3)', '(-6),(-2),4,5', '(-6)-(-2),4-5');
    t2('(-5)-(-3)', '3', '(-5)-(-3),3');
  });

  t.test('unbounded', () => {
    t2('5-', '10', '5-');
    t2('5-', '4', '4-');
    t2('5-', '3', '3,5-');
    t2('5-', '10-', '5-');
    t2('5-', '2-', '2-');
    t2('-5', '10', '-5,10');
    t2('-5', '6', '-6');
    t2('-5', '2', '-5');
    t2('-5', '-10', '-10');
    t2('-5', '-2', '-5');
    t2('-5', '3-', '-');
    t2('-5', '6-', '-');
    t2('-5,8-', '1-10', '-');
    t2('-3', '5-', '-3,5-');
    t2('-(-10)', '(-8),0,10-', '-(-10),(-8),0,10-');
    t2('-(-10)', '(-8),0,10-', '-(-10),(-8),0,10-');
    t2('-', '(-8),0,10-', '-');
    t2('-', '-', '-');
    t2('', '-', '-');
  });
});

test('subtract', t => {
  const t2 = makeT2(mr.subtract, mr.stringify);

  t.test('positive', () => {
    t2('1-10', '100', '1-10');
    t2('1-10', '0', '1-10');
    t2('1-10', '11', '1-10');
    t2('1-10', '1', '2-10');
    t2('1-10', '10', '1-9');
    t2('1-10', '1-10', '');
    t2('1-10', '5-8', '1-4,9-10');
    t2('1-10,20-30', '11-19', '1-10,20-30');
    t2('1-10,20-30', '5-25', '1-4,26-30');
    t2('1-100', '1,3,5,7,9', '2,4,6,8,10-100');
  });

  t.test('negative', () => {
    t2('(-10)-(-3)', '5', '(-10)-(-3)');
    t2('(-10)-(-3)', '(-10)', '(-9)-(-3)');
    t2('(-10)-(-3)', '(-3)', '(-10)-(-4)');
    t2('(-10)-(-3)', '(-5)', '(-10)-(-6),(-4)-(-3)');
    t2(
      '(-30),(-20)-(-10),(-8)-0,8',
      '(-20),(-12)-(-5)',
      '(-30),(-19)-(-13),(-4)-0,8'
    );
  });

  t.test('unbounded', () => {
    t2('10-20', '15-', '10-14');
    t2('10-20', '-15', '16-20');
    t2('10-20', '-12,18-', '13-17');
    t2('-12,18-', '5', '-4,6-12,18-');
    t2('-12,18-', '5,20', '-4,6-12,18-19,21-');
    t2('-12,18-', '-20,3-', '');
    t2('-12,18-', '-', '');
    t2('-', '200-205', '-199,206-');
    t2('-', '-100,150-', '101-149');
    t2('-', '-100,120,130,150-', '101-119,121-129,131-149');
    t2('-', '-', '');
  });
});

test('intersect', t => {
  const t2 = makeT2(mr.intersect, mr.stringify, true);

  t.test('positive', () => {
    t2('1-5', '8', '');
    t2('5-100', '1,10,50,70,80,90,100,101', '10,50,70,80,90,100');
    t2('5-100', '1-10,90-110', '5-10,90-100');
    t2('30-50,60-80,90-120', '45-65,75-90', '45-50,60-65,75-80,90');
    t2('10,12,14,16,18,20', '11,13,15,17,19,21', '');
    t2('10,12,14,16,18,20', '10,12,14,16,18,20', '10,12,14,16,18,20');
    t2('10-12,14-16,18-20', '11,13,15,17,19,21', '11,15,19');
    t2('10-12,14-16,18-20', '10-12,14-16,18-20', '10-12,14-16,18-20');
    t2('10-12,14-16,18-20', '20-22,24-26,28-30', '20');
    t2('', '', '');
  });

  t.test('negative', () => {
    t2('0', '0', '0');
    t2('(-50)-50', '(-30)-30', '(-30)-30');
    t2('(-50)-50', '5-30', '5-30');
    t2('(-50)-50', '(-100)-(-20)', '(-50)-(-20)');
    t2('(-20)-(-18),(-16)-(-14),(-12)-(-10)', '1-50', '');
    t2(
      '(-20)-(-18),(-16)-(-14),(-12)-(-10)',
      '(-19)-(-12)',
      '(-19)-(-18),(-16)-(-14),(-12)'
    );
  });

  t.test('unbounded', () => {
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
});

test('monkey test', () => {
  const arrs: number[][] = [[], [], []];
  for (let i = -100; i <= 100; i++) {
    arrs[Math.floor(Math.random() * 3)].push(i);
  }

  const shuffle = (array: number[]) => {
    const result = array.slice(0);
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const mirs = arrs.map(shuffle).map(mr.normalize);
  const res1 = mirs.reduce(mr.append, []);
  assert.strictEqual(mr.stringify(res1), '(-100)-100');

  const res2 = mirs.reduce(mr.subtract, [[-Infinity, Infinity]]);
  assert.strictEqual(mr.stringify(res2), '-(-101),101-');

  assert.strictEqual(mr.intersect(mirs[0], mirs[1]).length, 0);
  assert.strictEqual(mr.intersect(mirs[0], mirs[2]).length, 0);
  assert.strictEqual(mr.intersect(mirs[1], mirs[2]).length, 0);
});

test('has', t => {
  const t2 = makeT2(mr.has);

  t.test('bounded', () => {
    t2('5-20,25-100,150-300', '7', true);
    t2('5-20,25-100,150-300', '25', true);
    t2('5-20,25-100,150-300', '300', true);
    t2('5-20,25-100,150-300', '5-10', true);
    t2('5-20,25-100,150-300', '5-10,25', true);
    t2('5-20,25-100,150-300', '25-40,160', true);
    t2('5-20,25-100,150-300', '5-20,25-100,150-300', true);
    t2('5-20,25-100,150-300', '5,80,18-7,280,100,15-20,25,200-250', true);
    t2('5-20,25-100,150-300', '', true);
    t2('(-300)-(-200),(-50)-(-30),20-25', '(-40),(-250)-(-280)', true);
    t2('(-300)-(-200),(-50)-(-30),20-25', '(-200)-(-250),(-280)-(-220)', true);
    t2('5-20,25-100,150-300', '3', false);
    t2('5-20,25-100,150-300', '22', false);
    t2('5-20,25-100,150-300', '500', false);
    t2('5-20,25-100,150-300', '10-21', false);
    t2('5-20,25-100,150-300', '149-400', false);
    t2('5-20,25-100,150-300', '5-20,25-103,150-300', false);
    t2('5-20,25-100,150-300', '5,80,18-7,280,100,15-20,25,200-250,301', false);
    t2('(-300)-(-200),(-50)-(-30),20-25', '(-40),(-100)', false);
  });

  t.test('unbounded', () => {
    t2('-', '5', true);
    t2('-20,40-', '70', true);
    t2('-20,40', '10', true);
    t2('-20,30-35,40-', '-10,30,31,50-', true);
    t2('-', '-', true);
    t2('-20,40-', '30', false);
    t2('-20,40-', '10-50', false);
    t2('-20,40-', '10-', false);
    t2('-20,40-', '-50', false);
    t2('-20,40-', '-', false);
  });
});

test('length', () => {
  const t = makeT1(mr.length);
  t('', 0);
  t('5', 1);
  t('5-10', 6);
  t('1,3,10-15,20-21', 10);
  t('(-7)-(-4),(-1)-3,5', 10);
  t('-5', Infinity);
  t('8-', Infinity);
  t('-', Infinity);
});

test('equals', () => {
  const t = makeT2(mr.equals, b => b, true);
  t('', '', true);
  t('5', '5', true);
  t('2-8,10-12,15-20', '2-8,10-12,15-20', true);
  t('(-7)-(-4),(-1)-3,5', '(-7)-(-4),(-1)-3,5', true);
  t('-8,20-', '-8,20-', true);
  t('', '5', false);
  t('5', '5-6', false);
  t('2-8', '2-7', false);
  t('2-8,10-12,15-20', '2-8,10-12,15-20,23-25', false);
  const a = mr.parse('7-8,10');
  assert.strictEqual(mr.equals(a, a), true);
});

test('isUnbounded', () => {
  const t = makeT1(mr.isUnbounded);
  t('-5', true);
  t('0-5,10-', true);
  t('5-8', false);
  t('', false);
});

test('min', () => {
  const t = makeT1(mr.min);
  t('1,5,10-15', 1);
  t('-1,5,10', -Infinity);
  t('', undefined);
});

test('max', () => {
  const t = makeT1(mr.max);
  t('1,5,10-15', 15);
  t('1,5,10-', Infinity);
  t('', undefined);
});

test('at', () => {
  const t = (
    s: string,
    index: number,
    v: number | undefined | typeof RangeError
  ) =>
    v === RangeError
      ? assert.throws(
          () => mr.at(mr.parse(s, { parseUnbounded: true }), index),
          v
        )
      : assert.strictEqual(
          mr.at(mr.parse(s, { parseUnbounded: true }), index),
          v
        );

  t('2-4,8-10', 0, 2);
  t('2-4,8-10', 1, 3);
  t('2-4,8-10', 2, 4);
  t('2-4,8-10', 3, 8);
  t('2-4,8-10', 5, 10);
  t('2-4,8-10', 6, undefined);
  t('2-4,8-10', -1, 10);
  t('2-4,8-10', -6, 2);
  t('2-4,8-10', -7, undefined);
  t('2-4,8-10', Infinity, RangeError);
  t('2-4,8-10', -Infinity, RangeError);

  t('2-4,8-', 6, 11);
  t('-4,8-10', 6, RangeError);
  t('-4,8-10', -7, 1);
  t('2-4,8-', -7, RangeError);

  t('', Infinity, RangeError);
  t('', -Infinity, RangeError);
  t('', 0, undefined);
  t('', 1, undefined);
  t('', -1, undefined);

  const a = mr.parse('(-3)-0,5-6,9,12-14', { parseNegative: true });
  const vals = mr.flatten(a);
  for (let i = 0; i < vals.length; i++) {
    assert.strictEqual(mr.at(a, i), vals[i]);
    assert.strictEqual(mr.at(a, i - vals.length), vals[i]);
  }
});

test('tail', () => {
  const t = makeT1(mr.tail, mr.stringify);
  t('1,5,10-15', '5,10-15');
  t('0,5,10-', '5,10-');
  t('', '');
  assert.throws(() => mr.tail(parseAll('-1,5,10')), RangeError);
});

test('init', () => {
  const t = makeT1(mr.init, mr.stringify);
  t('1,5,10-15', '1,5,10-14');
  t('-0,5,10', '-0,5');
  t('', '');
  assert.throws(() => mr.init(parseAll('5,10-')), RangeError);
});

test('stringify', () => {
  const t = (a: string) => assert.strictEqual(mr.stringify(parseAll(a)), a);
  t('15-20,30-70');
  t('0');
  t('(-8)-(-5)');
  t('-');
  t('-10');
  t('10-');
  t('');

  const r = mr.parse('2-3,5,7-9');
  const t2 = (individualThreshold: number, expected: string) =>
    assert.strictEqual(mr.stringify(r, { individualThreshold }), expected);
  t2(0, '2-3,5-5,7-9');
  t2(1, '2-3,5,7-9');
  t2(2, '2,3,5,7-9');
  t2(3, '2,3,5,7,8,9');
  t2(4, '2,3,5,7,8,9');
});

test('flatten', () => {
  const t = (a: string, expected: number[]) =>
    assert.deepEqual(mr.flatten(parseAll(a)), expected);
  t('', []);
  t('2', [2]);
  t('2-5', [2, 3, 4, 5]);
  t('2-3,8,10-12', [2, 3, 8, 10, 11, 12]);
  t('(-8)-(-6),0,2-3', [-8, -7, -6, 0, 2, 3]);
  assert.throws(() => mr.flatten([[-Infinity, -5]]), RangeError);
  assert.throws(() => mr.flatten([[3, Infinity]]), RangeError);
});

test('iterate', () => {
  assert.deepEqual([...mr.iterate([[1, 3]])], [1, 2, 3]);
  assert.deepEqual([...mr.iterate([[1, 3]], { descending: true })], [3, 2, 1]);

  const r = parseAll('(-8)-(-6),2,5-7');
  assert.deepEqual(Array.from(mr.iterate(r)), [-8, -7, -6, 2, 5, 6, 7]);
  assert.deepEqual(
    Array.from(mr.iterate(r, { descending: true })),
    [7, 6, 5, 2, -6, -7, -8]
  );

  assert.deepEqual([...mr.iterate([])], []);
  assert.deepEqual([...mr.iterate([], { descending: true })], []);
  assert.throws(() => mr.iterate(parseAll('3-')), RangeError);
});
