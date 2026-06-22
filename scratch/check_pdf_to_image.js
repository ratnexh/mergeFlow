const fs = require('fs');
const content = fs.readFileSync('src/app/pdf-to-image/PdfToImageClient.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((line, idx) => {
  if (line.includes('<Header') || line.includes('<Footer') || line.includes('view') || line.includes('return (')) {
    if (idx < 50 || idx > lines.length - 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
