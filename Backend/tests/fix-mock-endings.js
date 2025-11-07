const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');
const lines = content.split('\n');

// jest.mock calls that should end with });
const shouldEndWithOneParen = [
  151, 362, 593, 627, 1472, 1785, 1923, 1939, 1984, 2010, 2026, 2040, 2054, 2064, 2084, 2116, 2467, 2798, 3159, 3353, 4169, 4177, 4239,
];

// Find the end of each jest.mock call and fix it
for (const startLine of shouldEndWithOneParen) {
  let braceCount = 0;
  let foundStart = false;

  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];

    if (i === startLine - 1) {
      foundStart = true;
      // Count braces in the start line
      for (const char of line) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
      }
    } else if (foundStart) {
      // Count braces in current line
      for (const char of line) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
      }

      // If we're back to 0 braces and this line has the ending
      if (braceCount === 0 && line.includes('}));')) {
        console.log(`Fixing line ${i + 1}: ${line.trim()}`);
        lines[i] = line.replace('}));', '});');
        break;
      }
    }
  }
}

// Write fixed content back
fs.writeFileSync('setup.js', lines.join('\n'));
console.log('Fixed jest.mock endings');