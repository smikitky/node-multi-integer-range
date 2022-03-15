// This file is to generate sub-directory package.json file after building

// https://www.sensedeep.com/blog/posts/2021/how-to-create-single-source-npm-module.html

const fs = require('fs');
const path = require('path');

fs.writeFileSync(
  path.join(__dirname, '../lib/cjs/package.json'),
  JSON.stringify({ type: 'commonjs' }),
  'utf8'
);

fs.writeFileSync(
  path.join(__dirname, '../lib/esm/package.json'),
  JSON.stringify({ type: 'module' }),
  'utf8'
);
