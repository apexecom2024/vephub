const fs = require('fs');
const lines = fs.readFileSync('openAPI.json', 'utf8').split('\n');
let inside = false;
const out = [];
for(let line of lines) {
  if (line.startsWith('  /devices/{device_id}/login:')) { inside = true; }
  else if (inside && line.startsWith('  /')) { break; }
  if (inside) out.push(line);
}
console.log(out.join('\n'));
