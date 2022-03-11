import { MultiRange, Initializer, multirange } from './MultiRange';

const mr = (i?: Initializer) => {
  return multirange(i, { parseNegative: true, parseUnbounded: true });
};

const t = (mr: MultiRange, expected: any) => {
  expect(mr.toString()).toBe(expected);
};

describe('constructor', () => {
  test('initialize with various types of initializer', () => {
    t(mr('10-8,7-5,1-4'), '1-10');
    t(mr(-8), '(-8)');
    t(mr([]), '');
    t(mr(), '');
    t(mr([-4, 5, [8, 10], [12, 15]]), '(-4),5,8-10,12-15');
    t(mr(mr('5-10')), '5-10'); // clone
    // @ts-expect-error
    expect(() => mr(new Date())).toThrow(TypeError);
    expect(() => mr('2-5,8-10,*,99')).toThrow(SyntaxError);
    expect(() => mr('1-900719925474099100')).toThrow(RangeError);
  });

  test('respect options', () => {
    expect(() => multirange('(-5)-(-1)')).toThrow(SyntaxError);
    expect(() => multirange('(-5)-', { parseUnbounded: true })).toThrow(
      SyntaxError
    );
    expect(() => multirange('1-')).toThrow(SyntaxError);
    expect(() => multirange('-(-1)', { parseNegative: true })).toThrow(
      SyntaxError
    );
  });

  test('copy constructor copies options', () => {
    const o1 = multirange('5-10', {
      parseNegative: true,
      parseUnbounded: true
    });
    const b1 = multirange(o1);
    expect(b1.append('-(-5)').toString()).toBe('-(-5),5-10');

    const o2 = multirange('5-10');
    const b2 = multirange(o2);
    expect(() => b2.append('-(-5)')).toThrow(SyntaxError);

    // If another options is explicitly provided, respect it
    const b3 = multirange(o1, {});
    expect(() => b3.append('-5')).toThrow(SyntaxError);
    expect(() => b3.append('(-1)')).toThrow(SyntaxError);
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
  expect(mr('5-20,25-100,150-300').has('5-20,25-100,150-300')).toBe(true);
  expect(mr('5-20,25-100,150-300').has([10, 20, 30, 40, 120])).toBe(false);
  // @ts-expect-error
  expect(() => mr(5).has()).toThrow(TypeError);
  expect(() => multirange('1-10').has('(-5)')).toThrow(SyntaxError);
});

test('#length', () => {
  expect(mr('1,3,10-15,20-21').length()).toBe(10);
});

test('#segmentLength', () => {
  expect(mr('').segmentLength()).toBe(0);
  expect(mr('1,3,10-15,20-21').segmentLength()).toBe(4);
  expect(mr('-3,8-').segmentLength()).toBe(2);
  expect(mr('-').segmentLength()).toBe(1);
});

test('#equals', () => {
  expect(mr('(-7)-(-4),(-1)-3,5-').equals('(-7)-(-4),(-1)-3,5-')).toBe(true);
  expect(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20,23-25')).toBe(false);
  // @ts-expect-error
  expect(() => mr('').equals()).toThrow(TypeError);
  expect(() => multirange('1-10').equals('(-5)')).toThrow(SyntaxError);
});

test('#isUnbounded', () => {
  expect(mr([[-Infinity, 5]]).isUnbounded()).toBe(true);
  expect(mr(8).isUnbounded()).toBe(false);
});

test('#min', () => {
  expect(mr('1,5,10-15').min()).toBe(1);
  expect(mr('-1,5,10').min()).toBe(-Infinity);
  expect(mr('').min()).toBe(undefined);
});

test('#max', () => {
  expect(mr('1,5,10-15').max()).toBe(15);
  expect(mr('1,5,10-').max()).toBe(Infinity);
  expect(mr('').max()).toBe(undefined);
});

test('#pop', () => {
  const r1 = mr('5,8-9');
  expect(r1.pop()).toBe(9);
  expect(r1.pop()).toBe(8);
  expect(r1.pop()).toBe(5);
  expect(r1.pop()).toBe(undefined);
  expect(r1.pop()).toBe(undefined);
  expect(r1.segmentLength()).toBe(0);

  const r2 = mr('-5,9');
  expect(r2.pop()).toBe(9);
  expect(r2.pop()).toBe(5);
  expect(r2.pop()).toBe(4);
  expect(r2.pop()).toBe(3);
  expect(r2.equals('-2')).toBe(true);

  expect(() => mr('8-').pop()).toThrow(RangeError);
});

test('#shift', () => {
  const r1 = mr('5,8-9');
  expect(r1.shift()).toBe(5);
  expect(r1.shift()).toBe(8);
  expect(r1.shift()).toBe(9);
  expect(r1.shift()).toBe(undefined);
  expect(r1.shift()).toBe(undefined);
  expect(r1.segmentLength()).toBe(0);

  const r2 = mr('5,9-');
  expect(r2.shift()).toBe(5);
  expect(r2.shift()).toBe(9);
  expect(r2.shift()).toBe(10);
  expect(r2.shift()).toBe(11);
  expect(r2.equals('12-')).toBe(true);

  expect(() => mr('-8').shift()).toThrow(RangeError);
});

test('#toString', () => {
  expect('' + mr('15-20')).toBe('15-20');
  expect('' + mr([[10, Infinity]])).toBe('10-');
});

test('#toArray', () => {
  expect(mr('2-3,8,10-12').toArray()).toEqual([2, 3, 8, 10, 11, 12]);
  expect(() => mr('-5').toArray()).toThrow(RangeError);
});

test('#getRanges', () => {
  const a = mr('5,12-15');
  const ranges = a.getRanges();
  expect(ranges).toEqual([
    [5, 5],
    [12, 15]
  ]);
  ranges[0][1] = 7;
  ranges[1][0] = 14;
  t(a, '5,12-15'); // ensure the internal range data is not changed
});

test('Iteration', () => {
  const testIter = (mr: MultiRange, expected: number[]) => {
    expect(Array.from(mr)).toEqual(expected);
    const iter = mr.getIterator();
    const arr: number[] = [];
    let val;
    while (!(val = iter.next()).done) arr.push(val.value!);
    expect(arr).toEqual(expected);
  };
  testIter(mr(''), []);
  testIter(mr('(-8)-(-6),0,2-3'), [-8, -7, -6, 0, 2, 3]);
});
