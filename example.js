import * as mr from 'multi-integer-range';

const ranges1 = mr.parse('1-6,9-12');
const ranges2 = mr.parse('7-10,100');
const ranges3 = mr.normalize([1, 5, 6, [4, 2]]);

console.log('append', mr.append(ranges1, ranges2));
console.log('subtract', mr.subtract(ranges1, ranges2));
console.log('intersect', mr.intersect(ranges1, ranges2));

console.log('stringify', mr.stringify(sum));
console.log('has', mr.has(range1, ranges3));
console.log('equals', mr.equals(range1, range2));
console.log('flatten', mr.flatten(ranges3));
console.log('length', mr.length(ranges1));
