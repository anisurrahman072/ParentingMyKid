'use strict';

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const srcDir = path.join(__dirname, '..', 'src');
const files = ['domains.js', 'domains.d.ts', 'index.js', 'index.d.ts'];

for (const f of files) {
  fs.copyFileSync(path.join(dist, f), path.join(srcDir, f));
}
