/////////////////////////////
// Example of ES6-style generators (node.js >= 4.0 required)

'use strict';

var MultiRange = require('../js/multi-integer-range').MultiRange;

var mr = new MultiRange('1-3,5,8-10');

function* iterateMultiRange(mr) {
	for (let range of mr.getRanges())
		for (let n = range[0]; n <= range[1]; n++)
			yield n;
}

for (let n of iterateMultiRange(mr)) console.log(n);

/////////////////////////////
// Extend MultiRange and add ES6 iterator  (node.js >= 4.0 required)

MultiRange.prototype[Symbol.iterator] = function*() {
	for (let range of this.ranges)
		for (let n = range[0]; n <= range[1]; n++)
			yield n;
};

for (let n of new MultiRange('10-12,14')) console.log(n);
