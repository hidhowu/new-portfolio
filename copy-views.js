const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', 'public', 'views');
const dest = path.join(__dirname, 'dist', 'public', 'views');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log('Copied EJS views ->', dest);
