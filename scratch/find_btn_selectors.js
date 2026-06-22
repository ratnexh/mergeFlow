const fs = require('fs');
const content = fs.readFileSync('src/app/globals.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('btn') || line.includes('button')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
