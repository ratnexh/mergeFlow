function cleanOcrText(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const cleanedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanedLines.push(""); // Keep paragraph breaks
      continue;
    }

    // Count character types
    let letters = 0;
    let digits = 0;
    let symbols = 0;
    for (let char of trimmed) {
      if (/[a-zA-Z]/.test(char)) {
        letters++;
      } else if (/[0-9]/.test(char)) {
        digits++;
      } else if (/\s/.test(char)) {
        // Space
      } else {
        symbols++;
      }
    }

    const totalAlphanumeric = letters + digits;
    const totalChars = trimmed.length;

    // Rule 1: Drop lines that consist entirely of symbols/lines
    if (totalAlphanumeric === 0 && symbols > 0) {
      console.log(`Dropped by Rule 1: "${trimmed}"`);
      continue;
    }

    // Rule 2: Drop very short lines that are mostly symbols or single random characters
    if (trimmed.length <= 3) {
      // Keep valid single letter words or numbers
      if (/^(a|A|i|I|[0-9])$/.test(trimmed)) {
        cleanedLines.push(trimmed);
      } else {
        console.log(`Dropped by Rule 2: "${trimmed}"`);
      }
      continue;
    }

    // Rule 3: Drop tokens containing only single letter elements (stray columns/noise)
    const tokens = trimmed.split(/\s+/);
    const alphanumericTokens = tokens.filter(t => /[a-zA-Z0-9]/.test(t));
    if (alphanumericTokens.length > 0 && alphanumericTokens.every(t => t.length === 1) && alphanumericTokens.length < 3) {
      console.log(`Dropped by Rule 3: "${trimmed}"`);
      continue;
    }

    // Rule 4: If symbols/punctuation make up a large portion (e.g. > 35%) of the line and alphanumeric is low
    if (symbols / (totalChars || 1) > 0.35 && totalAlphanumeric < 6) {
      console.log(`Dropped by Rule 4: "${trimmed}"`);
      continue;
    }

    // Rule 5: Drop lines that match common OCR garbage/separator patterns
    if (/^[\[\]\(\)\|\/\-\+=_\\%\s\.:]+$/.test(trimmed)) {
      console.log(`Dropped by Rule 5: "${trimmed}"`);
      continue;
    }

    // Rule 6: Drop lines with low alphanumeric density and containing specific garbage letters
    if (letters < 3 && symbols > letters) {
      console.log(`Dropped by Rule 6: "${trimmed}"`);
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join("\n");
}

const text = `[
imaging. - '
le
y
v
/' 2.
s \\ |
%
\\ | B
AL IS e |
g 'uf::: -
| AT e`;

console.log("--- START CLEAN ---");
const cleaned = cleanOcrText(text);
console.log("--- RESULT ---");
console.log(cleaned);
