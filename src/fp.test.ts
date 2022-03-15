import * as mr from './fp';
import { MIR, Range } from './fp';

describe('parse', () => {
  test('no option', () => {
    expect(mr.parse('')).toEqual([]);
    expect(mr.parse('0')).toEqual([[0, 0]]);
    expect(mr.parse('1-3,5,7-10')).toEqual([
      [1, 3],
      [5, 5],
      [7, 10]
    ]);
    expect(() => mr.parse('5-')).toThrow(SyntaxError);
    expect(() => mr.parse('(-10)')).toThrow(SyntaxError);
  });

  test('parse negative', () => {
    expect(mr.parse('(-5)', { parseNegative: true })).toEqual([[-5, -5]]);
    expect(
      mr.parse('(-10)-(-7),(-5),(-3)-(-1)', { parseNegative: true })
    ).toEqual([
      [-10, -7],
      [-5, -5],
      [-3, -1]
    ]);
  });

  test('parse unbounded', () => {
    expect(mr.parse('10-', { parseUnbounded: true })).toEqual([[10, Infinity]]);
    expect(mr.parse('-5', { parseUnbounded: true })).toEqual([[-Infinity, 5]]);
    expect(mr.parse('-5,10-', { parseUnbounded: true })).toEqual([
      [-Infinity, 5],
      [10, Infinity]
    ]);
  });

  test('strip spaces', () => {
    expect(mr.parse('1 -3,  5,\t7-10\n')).toEqual([
      [1, 3],
      [5, 5],
      [7, 10]
    ]);
  });

  test('normalize', () => {
    expect(mr.parse('1,8,2-4,7,5-6,10-9')).toEqual([[1, 10]]);
    expect(mr.parse('10-8,7-5,1-4')).toEqual([[1, 10]]);
    expect(parseAll('8-10,(-5),100-, 0,7,(-1)-(-4),1-6')).toEqual([
      [-5, 10],
      [100, Infinity]
    ]);
  });

  test('throw SyntaxError for invalid input', () => {
    expect(() => mr.parse('abc')).toThrow(SyntaxError);
    expect(() => mr.parse('1.5')).toThrow(SyntaxError);
    expect(() => mr.parse('2-5,8-10,*,99')).toThrow(SyntaxError);
    expect(() => mr.parse('2,,5')).toThrow(SyntaxError);
    expect(() => mr.parse(',')).toThrow(SyntaxError);
    // @ts-expect-error
    expect(() => mr.parse()).toThrow(TypeError);
    expect(() => mr.parse('')).not.toThrow();
  });

  test('throw RangeError for huge integer strings', () => {
    expect(() => mr.parse('1-900719925474099100')).toThrow(RangeError);
    expect(() => parseAll('(-900719925474099100)')).toThrow(RangeError);
  });
});

// prettier-ignore
test('normalize', () => {
  const t = (a: Parameters<typeof mr.normalize>[0], expected: Range[]) =>
    expect(mr.normalize(a)).toEqual(expected);

  t([[7, 5], 1], [[1, 1], [5, 7]]);
  t([3, 1, [5, 7], [0, -3]], [[-3, 1], [3, 3], [5, 7]]);
  t(5, [[5, 5]]);
  t([[1, Infinity], [-Infinity, 0]], [[-Infinity, Infinity]]);
  t([], []);
  t(undefined, []);
  // @ts-expect-error
  expect(() => mr.normalize([[1]])).toThrow(TypeError);
  // @ts-expect-error
  expect(() => mr.normalize([[2, 8, 3]])).toThrow(TypeError);
  // @ts-expect-error
  expect(() => mr.normalize(['str'])).toThrow(TypeError);
  expect(() => mr.normalize([[Infinity, Infinity]])).toThrow(RangeError);
  expect(() => mr.normalize([[-Infinity, -Infinity]])).toThrow(RangeError);
  expect(() => mr.normalize([Infinity])).toThrow(RangeError);
  expect(() => mr.normalize(Infinity)).toThrow(RangeError);
});

test('initialize', () => {
  const t = (a: Parameters<typeof mr.initialize>[0], expected: Range[]) =>
    expect(mr.initialize(a)).toEqual(expected);
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
    expect(resultFilter(testFunc(parseAll(data)))).toBe(expected);
  };

const makeT2 =
  <T, R>(
    testFunc: (a: MIR, b: MIR) => T,
    resultFilter: (result: T) => R = i => i as unknown as R,
    swappable?: boolean
  ) =>
  (a: string, b: string, expected: R) => {
    expect(resultFilter(testFunc(parseAll(a), parseAll(b)))).toBe(expected);
    if (swappable) {
      expect(resultFilter(testFunc(parseAll(b), parseAll(a)))).toBe(expected);
    }
  };

describe('append', () => {
  const t = makeT2(mr.append, mr.stringify, true);

  test('positive', () => {
    t('5-10', '5', '5-10');
    t('5-10', '8', '5-10');
    t('5-10', '10', '5-10');
    t('5-10', '11', '5-11');
    t('5-10', '4', '4-10');
    t('5-10', '15', '5-10,15');
    t('5-10', '1', '1,5-10');
    t('5-10,15-20', '12', '5-10,12,15-20');
    t('5-10,15-20', '3', '3,5-10,15-20');
    t('5-10,15-20', '25', '5-10,15-20,25');
    t('1-10,12-15,17-20', '11', '1-15,17-20');
    t('1-10,12-15,17-20', '1-100', '1-100');
    t('1-10,12-15,17-20,100', '5-14', '1-15,17-20,100');
    t('1-10,12-15,17-20', '14-19', '1-10,12-20');
    t('1,8,10', '2-3,4-5,6,7,9', '1-10');
  });

  test('negative', () => {
    t('(-5)-(-3)', '(-6),(-2),4,5', '(-6)-(-2),4-5');
    t('(-5)-(-3)', '3', '(-5)-(-3),3');
  });

  test('unbounded', () => {
    t('5-', '10', '5-');
    t('5-', '4', '4-');
    t('5-', '3', '3,5-');
    t('5-', '10-', '5-');
    t('5-', '2-', '2-');
    t('-5', '10', '-5,10');
    t('-5', '6', '-6');
    t('-5', '2', '-5');
    t('-5', '-10', '-10');
    t('-5', '-2', '-5');
    t('-5', '3-', '-');
    t('-5', '6-', '-');
    t('-5,8-', '1-10', '-');
    t('-3', '5-', '-3,5-');
    t('-(-10)', '(-8),0,10-', '-(-10),(-8),0,10-');
    t('-(-10)', '(-8),0,10-', '-(-10),(-8),0,10-');
    t('-', '(-8),0,10-', '-');
    t('-', '-', '-');
    t('', '-', '-');
  });
});

describe('subtract', () => {
  const t = makeT2(mr.subtract, mr.stringify);

  test('positive', () => {
    t('1-10', '100', '1-10');
    t('1-10', '0', '1-10');
    t('1-10', '11', '1-10');
    t('1-10', '1', '2-10');
    t('1-10', '10', '1-9');
    t('1-10', '1-10', '');
    t('1-10', '5-8', '1-4,9-10');
    t('1-10,20-30', '11-19', '1-10,20-30');
    t('1-10,20-30', '5-25', '1-4,26-30');
    t('1-100', '1,3,5,7,9', '2,4,6,8,10-100');
  });

  test('negative', () => {
    t('(-10)-(-3)', '5', '(-10)-(-3)');
    t('(-10)-(-3)', '(-10)', '(-9)-(-3)');
    t('(-10)-(-3)', '(-3)', '(-10)-(-4)');
    t('(-10)-(-3)', '(-5)', '(-10)-(-6),(-4)-(-3)');
    t(
      '(-30),(-20)-(-10),(-8)-0,8',
      '(-20),(-12)-(-5)',
      '(-30),(-19)-(-13),(-4)-0,8'
    );
  });

  test('unbounded', () => {
    t('10-20', '15-', '10-14');
    t('10-20', '-15', '16-20');
    t('10-20', '-12,18-', '13-17');
    t('-12,18-', '5', '-4,6-12,18-');
    t('-12,18-', '5,20', '-4,6-12,18-19,21-');
    t('-12,18-', '-20,3-', '');
    t('-12,18-', '-', '');
    t('-', '200-205', '-199,206-');
    t('-', '-100,150-', '101-149');
    t('-', '-100,120,130,150-', '101-119,121-129,131-149');
    t('-', '-', '');
  });
});

describe('intersect', () => {
  const t = makeT2(mr.intersect, mr.stringify, true);

  test('positive', () => {
    t('1-5', '8', '');
    t('5-100', '1,10,50,70,80,90,100,101', '10,50,70,80,90,100');
    t('5-100', '1-10,90-110', '5-10,90-100');
    t('30-50,60-80,90-120', '45-65,75-90', '45-50,60-65,75-80,90');
    t('10,12,14,16,18,20', '11,13,15,17,19,21', '');
    t('10,12,14,16,18,20', '10,12,14,16,18,20', '10,12,14,16,18,20');
    t('10-12,14-16,18-20', '11,13,15,17,19,21', '11,15,19');
    t('10-12,14-16,18-20', '10-12,14-16,18-20', '10-12,14-16,18-20');
    t('10-12,14-16,18-20', '20-22,24-26,28-30', '20');
    t('', '', '');
  });

  test('negative', () => {
    t('0', '0', '0');
    t('(-50)-50', '(-30)-30', '(-30)-30');
    t('(-50)-50', '5-30', '5-30');
    t('(-50)-50', '(-100)-(-20)', '(-50)-(-20)');
    t('(-20)-(-18),(-16)-(-14),(-12)-(-10)', '1-50', '');
    t(
      '(-20)-(-18),(-16)-(-14),(-12)-(-10)',
      '(-19)-(-12)',
      '(-19)-(-18),(-16)-(-14),(-12)'
    );
  });

  test('unbounded', () => {
    t('1-', '4-', '4-');
    t('100-', '-300', '100-300');
    t('-5', '-0', '-0');
    t('-10,50,90-', '0-100', '0-10,50,90-100');
    t('-40,70,80-', '-50,70,90-', '-40,70,90-');
    t('-10', '80-', '');
    t('-', '-', '-');
    t('-', '-90', '-90');
    t('-', '80-', '80-');
    t('-', '40-45,(-20)', '(-20),40-45');
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
  expect(mr.stringify(res1)).toBe('(-100)-100');

  const res2 = mirs.reduce(mr.subtract, [[-Infinity, Infinity]]);
  expect(mr.stringify(res2)).toBe('-(-101),101-');

  expect(mr.intersect(mirs[0], mirs[1]).length).toBe(0);
  expect(mr.intersect(mirs[0], mirs[2]).length).toBe(0);
  expect(mr.intersect(mirs[1], mirs[2]).length).toBe(0);
});

describe('has', () => {
  const t = makeT2(mr.has);

  test('bounded', () => {
    t('5-20,25-100,150-300', '7', true);
    t('5-20,25-100,150-300', '25', true);
    t('5-20,25-100,150-300', '300', true);
    t('5-20,25-100,150-300', '5-10', true);
    t('5-20,25-100,150-300', '5-10,25', true);
    t('5-20,25-100,150-300', '25-40,160', true);
    t('5-20,25-100,150-300', '5-20,25-100,150-300', true);
    t('5-20,25-100,150-300', '5,80,18-7,280,100,15-20,25,200-250', true);
    t('5-20,25-100,150-300', '', true);
    t('(-300)-(-200),(-50)-(-30),20-25', '(-40),(-250)-(-280)', true);
    t('(-300)-(-200),(-50)-(-30),20-25', '(-200)-(-250),(-280)-(-220)', true);
    t('5-20,25-100,150-300', '3', false);
    t('5-20,25-100,150-300', '22', false);
    t('5-20,25-100,150-300', '500', false);
    t('5-20,25-100,150-300', '10-21', false);
    t('5-20,25-100,150-300', '149-400', false);
    t('5-20,25-100,150-300', '5-20,25-103,150-300', false);
    t('5-20,25-100,150-300', '5,80,18-7,280,100,15-20,25,200-250,301', false);
    t('(-300)-(-200),(-50)-(-30),20-25', '(-40),(-100)', false);
  });

  test('unbounded', () => {
    t('-', '5', true);
    t('-20,40-', '70', true);
    t('-20,40', '10', true);
    t('-20,30-35,40-', '-10,30,31,50-', true);
    t('-', '-', true);
    t('-20,40-', '30', false);
    t('-20,40-', '10-50', false);
    t('-20,40-', '10-', false);
    t('-20,40-', '-50', false);
    t('-20,40-', '-', false);
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
  expect(mr.equals(a, a)).toBe(true);
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

test('tail', () => {
  const t = makeT1(mr.tail, mr.stringify);
  t('1,5,10-15', '5,10-15');
  t('0,5,10-', '5,10-');
  t('', '');
  expect(() => mr.tail(parseAll('-1,5,10'))).toThrow(RangeError);
});

test('init', () => {
  const t = makeT1(mr.init, mr.stringify);
  t('1,5,10-15', '1,5,10-14');
  t('-0,5,10', '-0,5');
  t('', '');
  expect(() => mr.init(parseAll('5,10-'))).toThrow(RangeError);
});

test('stringify', () => {
  const t = (a: string) => expect(mr.stringify(parseAll(a))).toBe(a);
  t('15-20,30-70');
  t('0');
  t('(-8)-(-5)');
  t('-');
  t('-10');
  t('10-');
  t('');
});

test('flatten', () => {
  const t = (a: string, expected: number[]) =>
    expect(mr.flatten(parseAll(a))).toEqual(expected);
  t('', []);
  t('2', [2]);
  t('2-5', [2, 3, 4, 5]);
  t('2-3,8,10-12', [2, 3, 8, 10, 11, 12]);
  t('(-8)-(-6),0,2-3', [-8, -7, -6, 0, 2, 3]);
  expect(() => mr.flatten([[-Infinity, -5]])).toThrow(RangeError);
  expect(() => mr.flatten([[3, Infinity]])).toThrow(RangeError);
});

test('iterate', () => {
  expect([...mr.iterate([[1, 5]])]).toEqual([1, 2, 3, 4, 5]);
  expect(Array.from(mr.iterate(parseAll('(-8)-(-6),2,5-7')))).toEqual([
    -8, -7, -6, 2, 5, 6, 7
  ]);
  expect([...mr.iterate([])]).toEqual([]);
  expect(() => mr.iterate(parseAll('3-'))).toThrow(RangeError);
});
