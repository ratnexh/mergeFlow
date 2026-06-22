const fs = require('fs');
const content = fs.readFileSync('src/app/merge/MergeClient.js', 'utf8');
const lines = content.split('\n');
for (let i = 600; i < 710; i++) {
  if (lines[i]) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
