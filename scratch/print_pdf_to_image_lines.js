const fs = require('fs');
const content = fs.readFileSync('src/app/pdf-to-image/PdfToImageClient.js', 'utf8');
const lines = content.split('\n');
for (let i = 800; i < 838; i++) {
  if (lines[i]) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
