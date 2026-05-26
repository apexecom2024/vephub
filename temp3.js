const fs = require('fs');
const lines = fs.readFileSync('openAPI.json', 'utf8').split('\n');
console.log(lines.filter(l => l.startsWith('  /') || l.startsWith('  get:') || l.startsWith('  post:')).join('\n'));
