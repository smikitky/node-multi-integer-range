const { MultiRange, multirange } = require('multi-integer-range');

// Just a nice shorthand for you
const mr = value =>
  multirange(value, { parseUnbounded: true, parseNegative: true });

// Basic manipulation
const range = mr('1-5, 9, 8')
  .append(10)
  .subtract(1);
console.log(range.toString());

// Iterator & array spread
console.log([...mr('(-103)-(-100), 101-103')]);
