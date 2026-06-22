const fs = require('fs');
const content = fs.readFileSync('src/app/merge/MergeClient.js', 'utf8');
const lines = content.split('\n');
for (let i = 700; i < 860; i++) {
  if (lines[i]) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
