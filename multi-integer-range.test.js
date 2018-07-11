var multi_integer_range = require('./lib/multi-integer-range');
var MultiRange = multi_integer_range.MultiRange;
var multirange = multi_integer_range.multirange;

describe('MultiRange', () => {
  function mr(i) {
    return multirange(i, { parseNegative: true, parseUnbounded: true });
  }

  var mrd = multirange;

  function t(mr, expected) {
    expect(mr.toString()).toBe(expected);
  }

  describe('constructor', () => {
    it('must initialize with a string', () => {
      t(mr(''), '');
      t(mr('5'), '5');
      t(mr('0'), '0');
      t(mr('(-5)'), '(-5)');
      t(mr('1-3,5,7-10'), '1-3,5,7-10');
      t(mr('(-10)-(-7),(-5),(-3)-(-1)'), '(-10)-(-7),(-5),(-3)-(-1)');
      t(mr('1 -3,  5,\t7-10\n'), '1-3,5,7-10');
    });

    it('must throw if parseNegative is turned off', () => {
      expect(() => mrd('(-1)')).toThrow(SyntaxError);
      expect(() => mrd('(-5)-(-1)')).toThrow(SyntaxError);
      expect(() => mrd('(-5)-', { parseUnbounded: true })).toThrow(SyntaxError);
    });

    it('must throw if parseUnbounded is turned off', () => {
      expect(() => mrd('1-')).toThrow(SyntaxError);
      expect(() => mrd('-')).toThrow(SyntaxError);
      expect(() => mrd('-1')).toThrow(SyntaxError);
      expect(() => mrd('-(-1)', { parseNegative: true })).toThrow(SyntaxError);
    });

    it('must parse unbounded ranges', () => {
      t(mr('10-'), '10-');
      t(mr('-10'), '-10');
      t(mr('5,10-'), '5,10-');
      t(mr('-10,20,50'), '-10,20,50');
    });

    it('must parse string with random/reverse order', () => {
      t(mr('1,8,2-4,7,5-6,10-9'), '1-10');
      t(mr('10-8,7-5,1-4'), '1-10');
      t(mr('8-10,(-5),0,7,(-1)-(-4),1-6'), '(-5)-10');
    });

    it('must initialize with a single integer', () => {
      t(mr(2), '2');
      t(mr(0), '0');
      t(mr(-8), '(-8)');
    });

    it('must initialize with an array', () => {
      t(mr([]), '');
      t(mr([1, 10, 8, -5, 9]), '(-5),1,8-10');
      t(mr([[2, 5], [7, 10]]), '2-5,7-10');
      t(mr([[-7, 1], [3, 9]]), '(-7)-1,3-9');
      t(mr([5, [8, 10], [12, 15]]), '5,8-10,12-15');
    });

    it('must construct with existing MultiRange', () => {
      t(mr(mr('5-10')), '5-10'); // aka clone
    });

    it('must copy the options when using copy constructor', () => {
      var original = mrd('5-10', { parseNegative: true });

      var b = mrd(original);
      expect(b.options.parseNegative).toBe(true);
      expect(b.options.parseUnbounded).toBe(false);

      // If another options is explicitly provided, respect it
      var c = mrd(original, { parseNegative: false, parseUnbounded: true });
      expect(c.options.parseNegative).toBe(false);
      expect(c.options.parseUnbounded).toBe(true);
    });

    it('must throw an error for invalid input', () => {
      expect(() => mr('abc')).toThrow(SyntaxError);
      expect(() => mr('1.5')).toThrow(SyntaxError);
      expect(() => mr('2-5,8-10,*,99')).toThrow(SyntaxError);
      expect(() => mr(',')).toThrow(SyntaxError);
      expect(() => mr(['abc'])).toThrow(TypeError);
      expect(() => mr([1, [5, 9, 7]])).toThrow(TypeError);
      expect(() => mr(null)).toThrow(TypeError);
      // followings are valid
      expect(() => mr(undefined)).not.toThrow();
      t(mr(undefined), '');
      expect(() => mr([])).not.toThrow();
      t(mr([]), '');
      expect(() => mr()).not.toThrow();
      t(mr(), '');
      expect(() => mr('')).not.toThrow();
      t(mr(''), '');
    });

    it('must thorw a RangeError for huge integer strings', () => {
      expect(() => mr('1-900719925474099100')).toThrow(RangeError);
      expect(() => mr('(-900719925474099100)')).toThrow(RangeError);
    });

    it('must throw an error for Infinity not as part of an unbounded range segment', () => {
      expect(() => mr(Infinity)).toThrow(RangeError);
      expect(() => mr([Infinity])).toThrow(RangeError);
      expect(() => mr([[Infinity, Infinity]])).toThrow(RangeError);
      expect(() => mr(-Infinity)).toThrow(RangeError);
      expect(() => mr([-Infinity])).toThrow(RangeError);
      expect(() => mr([[-Infinity, -Infinity]])).toThrow(RangeError);
    });
  });

  it('#clone', () => {
    var orig = mr('2-5');
    var clone = orig.clone();
    orig.append(6);
    clone.append(1);
    t(orig, '2-6');
    t(clone, '1-5');
  });

  describe('#append', () => {
    it('must append values correctly', () => {
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
      t(mr('1-10,12-15,17-20').append([[1, 100]]), '1-100');
      t(mr('1-10,12-15,17-20,100').append([[5, 14]]), '1-15,17-20,100');
      t(mr('1-10,12-15,17-20').append([[14, 19]]), '1-10,12-20');
    });
    it('must append negative values correctly', () => {
      t(mr('(-5)-(-3)').append([-6, -2, 4, 5]), '(-6)-(-2),4-5');
      t(mr('(-5)-(-3)').append(3), '(-5)-(-3),3');
      t(mr('(-5)-(-3)').append([[-8, -1], [3, 9]]), '(-8)-(-1),3-9');
      t(mr('(-5)-(-3),(-10)-(-8),0-6').append([-6, -7, [-2, -1]]), '(-10)-6');
    });
    it('must append unbounded ranges correctly', () => {
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
    it('must accept various input types', () => {
      t(mr('5-10,15-20').append(12), '5-10,12,15-20');
      t(mr('5-10,15-20').append('11-14,21-25'), '5-25');
      t(mr('5-10,15-20').append([12]), '5-10,12,15-20');
      t(mr('5-10,15-20').append([[12, 13]]), '5-10,12-13,15-20');
      t(mr('5-10,15-20').append(mr('11-14,21-25')), '5-25');
    });
    it('must throw an exception for empty call', () => {
      expect(() => {
        mr(5).append();
      }).toThrow(TypeError);
    });
    it('must be chainable', () => {
      t(
        mr('1-50')
          .append(60)
          .append('70')
          .append(mr([80]))
          .appendRange(90, 90),
        '1-50,60,70,80,90'
      );
    });
    it('must pass options correctly', () => {
      expect(() => {
        mrd('1', { parseNegative: false })
          .append(3)
          .append('(-5)');
      }).toThrow(SyntaxError);
      expect(() => {
        mrd('1', { parseUnbounded: false })
          .append(3)
          .append('3-');
      }).toThrow(SyntaxError);
    });
  });

  describe('#substract', () => {
    it('must subtract values correctly', () => {
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
    it('must subtract negative values correctly', () => {
      t(mr('(-10)-(-3)').subtract(5), '(-10)-(-3)');
      t(mr('(-10)-(-3)').subtract(-10), '(-9)-(-3)');
      t(mr('(-10)-(-3)').subtract(-3), '(-10)-(-4)');
      t(mr('(-10)-(-3)').subtract(-5), '(-10)-(-6),(-4)-(-3)');
      t(
        mr('(-30),(-20)-(-10),(-8)-0,8').subtract([-20, [-12, -5]]),
        '(-30),(-19)-(-13),(-4)-0,8'
      );
    });
    it('must subtract unbounded ranges correctly', () => {
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
    it('must accept various input types', () => {
      t(mr('1-20').subtract(5), '1-4,6-20');
      t(mr('1-20').subtract('5,10-15'), '1-4,6-9,16-20');
      t(mr('1-20').subtract([5, 10, 15]), '1-4,6-9,11-14,16-20');
      t(mr('1-20').subtract([[5, 10]]), '1-4,11-20');
      t(mr('1-20').subtract(mr('5,10-15')), '1-4,6-9,16-20');
    });
    it('must throw an exception for empty call', () => {
      expect(() => {
        mr(5).subtract();
      }).toThrow(TypeError);
    });
    it('must be chainable', () => {
      t(
        mr('1-50')
          .subtract(40)
          .subtract('30')
          .subtract(mr([20]))
          .subtractRange(10, 10),
        '1-9,11-19,21-29,31-39,41-50'
      );
    });
    it('must pass options correctly', () => {
      expect(() => {
        mrd('1-10', { parseNegative: false })
          .subtract(3)
          .subtract('(-5)');
      }).toThrow(SyntaxError);
      expect(() => {
        mrd('1-10', { parseUnbounded: false })
          .subtract(3)
          .subtract('3-');
      }).toThrow(SyntaxError);
    });
  });

  describe('#intersect', () => {
    // the result must remain consistent when operands are swapped
    function t2(r1, r2, expected) {
      t(mr(r1).intersect(r2), expected);
      t(mr(r2).intersect(r1), expected);
    }

    it('must calculate intersections correctly', () => {
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
    it('must calculate negative intersections correctly', () => {
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
    it('must calculate unbounded range intersections correctly', () => {
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
    it('must accept various input types', () => {
      t(mr('10-15').intersect(12), '12');
      t(mr('10-15').intersect('12-17'), '12-15');
      t(mr('10-15').intersect([12, 15, 17]), '12,15');
      t(mr('10-15').intersect([[12, 17]]), '12-15');
      t(mr('10-15').intersect(mr('12-17')), '12-15');
    });
    it('must throw an exception for empty call', () => {
      expect(() => {
        mr(5).intersect();
      }).toThrow(TypeError);
    });
    it('must be chainable', () => {
      t(
        mr('1-100')
          .intersect('20-150')
          .intersect('10-40'),
        '20-40'
      );
    });
    it('must pass options correctly', () => {
      expect(() => {
        mrd('1-10', { parseNegative: false })
          .intersect(5)
          .intersect('(-5)');
      }).toThrow(SyntaxError);
      expect(() => {
        mrd('1-10', { parseUnbounded: false })
          .intersect(5)
          .intersect('3-');
      }).toThrow(SyntaxError);
    });
  });

  describe('#has', () => {
    it('must perform correct inclusion check', () => {
      expect(mr('5-20,25-100,150-300').has('7')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('25')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('300')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('5-10')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('5-10,25')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('25-40,160')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('5-20,25-100,150-300')).toBe(true);
      expect(
        mr('5-20,25-100,150-300').has('5,80,18-7,280,100,15-20,25,200-250')
      ).toBe(true);
      expect(mr('5-20,25-100,150-300').has('')).toBe(true);

      expect(
        mr('(-300)-(-200),(-50)-(-30),20-25').has('(-40),(-250)-(-280)')
      ).toBe(true);
      expect(
        mr('(-300)-(-200),(-50)-(-30),20-25').has('(-200)-(-250),(-280)-(-220)')
      ).toBe(true);

      expect(mr('5-20,25-100,150-300').has('3')).toBe(false);
      expect(mr('5-20,25-100,150-300').has('22')).toBe(false);
      expect(mr('5-20,25-100,150-300').has('500')).toBe(false);
      expect(mr('5-20,25-100,150-300').has('10-21')).toBe(false);
      expect(mr('5-20,25-100,150-300').has('149-400')).toBe(false);
      expect(mr('5-20,25-100,150-300').has('5-20,25-103,150-300')).toBe(false);
      expect(
        mr('5-20,25-100,150-300').has('5,80,18-7,280,100,15-20,25,200-250,301')
      ).toBe(false);

      expect(mr('(-300)-(-200),(-50)-(-30),20-25').has('(-40),(-100)')).toBe(
        false
      );
    });
    it('must perform correct inclusion check for unbounded ranges', () => {
      expect(mr('-').has('5')).toBe(true);
      expect(mr('-20,40-').has('70')).toBe(true);
      expect(mr('-20,40').has('10')).toBe(true);
      expect(mr('-20,30-35,40-').has('-10,30,31,50-')).toBe(true);
      expect(mr('-').has('-')).toBe(true);
      expect(mr('-20,40-').has('30')).toBe(false);
      expect(mr('-20,40-').has('10-50')).toBe(false);
      expect(mr('-20,40-').has('10-')).toBe(false);
      expect(mr('-20,40-').has('-50')).toBe(false);
      expect(mr('-20,40-').has('-')).toBe(false);
    });
    it('must accept various input types', () => {
      expect(mr('5-20,25-100,150-300').has(30)).toBe(true);
      expect(mr('5-20,25-100,150-300').has(23)).toBe(false);
      expect(mr('5-20,25-100,150-300').has('30')).toBe(true);
      expect(mr('5-20,25-100,150-300').has('23')).toBe(false);
      expect(mr('5-20,25-100,150-300').has([10, 20, 30, 40])).toBe(true);
      expect(mr('5-20,25-100,150-300').has([10, 20, 30, 40, 120])).toBe(false);
      expect(mr('5-20,25-100,150-300').has([[10, 20], [30, 50]])).toBe(true);
      expect(
        mr('5-20,25-100,150-300').has([[10, 20], [21, 25], [30, 50]])
      ).toBe(false);
      expect(mr('5-20,25-100,150-300').has(mr('30'))).toBe(true);
      expect(mr('5-20,25-100,150-300').has(mr('23'))).toBe(false);
    });
    it('must throw an exception for empty call', () => {
      expect(() => {
        mr(5).has();
      }).toThrow(TypeError);
    });
    it('must pass options correctly', () => {
      expect(() => {
        mrd('1', { parseNegative: false }).has('(-5)');
      }).toThrow(SyntaxError);
      expect(() => {
        mrd('1', { parseUnbounded: false }).has('3-');
      }).toThrow(SyntaxError);
    });
  });

  it('#hasRange', () => {
    expect(mr('5-20,25-100,150-300').hasRange(5, 15)).toBe(true);
    expect(mr('5-20,25-100,150-300').hasRange(3, 10)).toBe(false);
  });

  it('#length', () => {
    expect(mr('').length()).toBe(0);
    expect(mr('5').length()).toBe(1);
    expect(mr('5-10').length()).toBe(6);
    expect(mr('1,3,10-15,20-21').length()).toBe(10);
    expect(mr('(-7)-(-4),(-1)-3,5').length()).toBe(10);
    expect(mr('-5').length()).toBe(Infinity);
    expect(mr('8-').length()).toBe(Infinity);
    expect(mr('-').length()).toBe(Infinity);
  });

  it('#segmentLength', () => {
    expect(mr('').segmentLength()).toBe(0);
    expect(mr('5').segmentLength()).toBe(1);
    expect(mr('5-10').segmentLength()).toBe(1);
    expect(mr('1,3,10-15,20-21').segmentLength()).toBe(4);
    expect(mr('(-7)-(-4),(-1)-3,5').segmentLength()).toBe(3);
    expect(mr('-3,8-').segmentLength()).toBe(2);
    expect(mr('-').segmentLength()).toBe(1);
  });

  it('#equals', () => {
    var foo = multirange('4,8,10-12');
    expect(foo.equals(foo)).toBe(true);

    expect(mr('').equals('')).toBe(true);
    expect(mr('5').equals(mr('5'))).toBe(true);
    expect(mr('2-8').equals('2-8')).toBe(true);
    expect(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20')).toBe(true);
    expect(mr('(-7)-(-4),(-1)-3,5').equals('(-7)-(-4),(-1)-3,5')).toBe(true);
    expect(mr('-8,20-').equals('-8,20-')).toBe(true);
    expect(mr('-').equals('1-,-0')).toBe(true);
    expect(mr('').equals('5')).toBe(false);
    expect(mr('5').equals('5-6')).toBe(false);
    expect(mr('2-8').equals('2-7')).toBe(false);
    expect(mr('2-8,10-12,15-20').equals('2-8,10-12,15-20,23-25')).toBe(false);

    expect(() => {
      mr('').equals();
    }).toThrow(TypeError);

    expect(() => {
      mrd('1-10', { parseNegative: false }).equals('(-5)');
    }).toThrow(SyntaxError);
  });

  it('#isUnbounded', () => {
    expect(mr([[-Infinity, 5]]).isUnbounded()).toBe(true);
    expect(mr([[0, 5], [10, Infinity]]).isUnbounded()).toBe(true);
    expect(mr(8).isUnbounded()).toBe(false);
  });

  it('#min', () => {
    expect(mr('1,5,10-15').min()).toBe(1);
    expect(mr('-1,5,10').min()).toBe(-Infinity);
    expect(mr().min()).toBe(undefined);
  });

  it('#max', () => {
    expect(mr('1,5,10-15').max()).toBe(15);
    expect(mr('1,5,10-').max()).toBe(Infinity);
    expect(mr().max()).toBe(undefined);
  });

  it('#pop', () => {
    var r = mr('5,8-9');
    expect(r.pop()).toBe(9);
    expect(r.pop()).toBe(8);
    expect(r.pop()).toBe(5);
    expect(r.pop()).toBe(undefined);
    expect(r.pop()).toBe(undefined);
    expect(r.segmentLength()).toBe(0);

    r = mr('-5,9');
    expect(r.pop()).toBe(9);
    expect(r.pop()).toBe(5);
    expect(r.pop()).toBe(4);
    expect(r.pop()).toBe(3);
    expect(r.equals('-2')).toBe(true);

    expect(() => {
      mr('8-').pop();
    }).toThrow(RangeError);
  });

  it('#shift', () => {
    var r = mr('5,8-9');
    expect(r.shift()).toBe(5);
    expect(r.shift()).toBe(8);
    expect(r.shift()).toBe(9);
    expect(r.shift()).toBe(undefined);
    expect(r.shift()).toBe(undefined);
    expect(r.segmentLength()).toBe(0);

    r = mr('5,9-');
    expect(r.shift()).toBe(5);
    expect(r.shift()).toBe(9);
    expect(r.shift()).toBe(10);
    expect(r.shift()).toBe(11);
    expect(r.equals('12-')).toBe(true);

    expect(() => {
      mr('-8').shift();
    }).toThrow(RangeError);
  });

  it('#toString', () => {
    expect('' + mr('15-20')).toBe('15-20');
    expect('' + mr('0')).toBe('0');
    expect('' + mr('(-8)-(-5)')).toBe('(-8)-(-5)');
    expect('' + mr([[-Infinity, Infinity]])).toBe('-');
    expect('' + mr([[-Infinity, 10]])).toBe('-10');
    expect('' + mr([[10, Infinity]])).toBe('10-');
    expect('' + mr()).toBe('');
  });

  describe('#toArray', () => {
    it('must build an array from a finite multirange', () => {
      expect(mr('').toArray()).toEqual([]);
      expect(mr('2').toArray()).toEqual([2]);
      expect(mr('2-5').toArray()).toEqual([2, 3, 4, 5]);
      expect(mr('2-3,8,10-12').toArray()).toEqual([2, 3, 8, 10, 11, 12]);
      expect(mr('(-8)-(-6),0,2-3').toArray()).toEqual([-8, -7, -6, 0, 2, 3]);
    });
    it('must throw an error for an infinite multirange', () => {
      expect(() => {
        mr('-5').toArray();
      }).toThrow(RangeError);
      expect(() => {
        mr('-').toArray();
      }).toThrow(RangeError);
    });
  });

  describe('Iteration', () => {
    it('#getIterator', () => {
      function testIter(mr, expected) {
        var it = mr.getIterator();
        var i = 0;
        var val = it.next();
        while (!val.done) {
          expect(val.value).toBe(expected[i++]);
          val = it.next();
        }
        expect(i).toBe(expected.length);
      }
      testIter(mr(''), []);
      testIter(mr('8'), [8]);
      testIter(mr('2-5'), [2, 3, 4, 5]);
      testIter(mr('2-5,8-10'), [2, 3, 4, 5, 8, 9, 10]);
      testIter(mr('(-8)-(-6),0,2-3'), [-8, -7, -6, 0, 2, 3]);
    });

    it('must throw an error for unbounded ranges', () => {
      expect(() => {
        mr([[8, Infinity]]).getIterator();
      }).toThrow(RangeError);
    });

    if (typeof Symbol.iterator !== 'symbol') {
      it.skip('ES6 iterator');
      return;
    }

    it('ES6 iterator', () => {
      function testIter(mr, expected) {
        var i = 0;
        for (var item of mr) {
          expect(item).toBe(expected[i++]);
        }
        expect(i).toBe(expected.length);
      }
      testIter(mr(''), []);
      testIter(mr('8'), [8]);
      testIter(mr('2-5'), [2, 3, 4, 5]);
      testIter(mr('2-5,8-10'), [2, 3, 4, 5, 8, 9, 10]);
      testIter(mr('(-8)-(-6),0,2-3'), [-8, -7, -6, 0, 2, 3]);
    });
  });

  it('must not change the internal data after getRanges()', () => {
    var a = mr('5,12-15,100');
    var ranges = a.getRanges();
    ranges[0][1] = 7;
    ranges[1][0] = 14;
    t(a, '5,12-15,100');
  });
});

// the followings are meta tests to check our assertion methods
// handle Inifinite numbers consistently across various runtimes
describe('Assertion', () => {
  it('must perform comparison on inifite numbers', () => {
    expect(Infinity === Infinity).toBe(true);
    expect(-Infinity === -Infinity).toBe(true);
    expect(10000000 < Infinity && -Infinity < -10000000).toBe(true);
    expect(Infinity).toBe(Infinity);
    expect(-Infinity).toBe(-Infinity);
    expect([3, Number.POSITIVE_INFINITY, 5, Number.NEGATIVE_INFINITY]).toEqual([
      3,
      Number.POSITIVE_INFINITY,
      5,
      Number.NEGATIVE_INFINITY
    ]);
  });
});
