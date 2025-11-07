const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');
const lines = content.split('\n');

// Find all jest.mock calls and fix their endings
let inJestMock = false;
let jestMockStartLine = -1;
let braceCount = 0;
let parenCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if this line starts a jest.mock call
  if (line.trim().startsWith('jest.mock(')) {
    inJestMock = true;
    jestMockStartLine = i;
    braceCount = 0;
    parenCount = 0;

    // Count opening brackets in this line
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '(') parenCount++;
    }
  } else if (inJestMock) {
    // Count brackets in current line
    for (const char of line) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
    }

    // Check if this line ends the jest.mock
    if (braceCount === 0 && line.includes('});')) {
      // This jest.mock ends with }); but should end with }));
      console.log(`Fixing jest.mock at line ${i + 1}: ${line.trim()}`);
      lines[i] = line.replace('});', '}));');
      inJestMock = false;
    } else if (braceCount === 0 && line.includes('}));')) {
      // This jest.mock is correctly closed
      inJestMock = false;
    }
  }
}

// Write the fixed content back
fs.writeFileSync('setup.js', lines.join('\n'));
console.log('Fixed jest.mock calls');