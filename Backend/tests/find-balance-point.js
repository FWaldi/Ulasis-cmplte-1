const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');

let parentheses = 0;
let braces = 0;
let brackets = 0;
let lineNum = 0;
let lastGoodLine = 0;

for (const line of content.split('\n')) {
  lineNum++;
  const beforeParentheses = parentheses;
  const beforeBraces = braces;
  const beforeBrackets = brackets;

  for (const char of line) {
    if (char === '(') parentheses++;
    else if (char === ')') parentheses--;
    else if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;

    if (parentheses < 0 || braces < 0 || brackets < 0) {
      console.log(`ERROR: Unmatched closing at line ${lineNum}: ${line.trim()}`);
      console.log('Character position: Found closing without matching opening');
      process.exit(1);
    }
  }

  // Track when we have the most balanced state
  if (parentheses === 0 && braces === 0 && brackets === 0) {
    lastGoodLine = lineNum;
  }
}

console.log(`Last line with all brackets balanced: ${lastGoodLine}`);
console.log(`Final counts: Parentheses: ${parentheses}, Braces: ${braces}, Brackets: ${brackets}`);

// Show the area around the last good line
const lines = content.split('\n');
console.log(`\nContext around line ${lastGoodLine}:`);
for (let i = Math.max(0, lastGoodLine - 5); i <= Math.min(lines.length - 1, lastGoodLine + 5); i++) {
  const marker = i === lastGoodLine ? ' <-- LAST BALANCED' : '';
  console.log(`${String(i + 1).padStart(4)}: ${lines[i]}${marker}`);
}