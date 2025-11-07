const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');

let parentheses = 0;
let braces = 0;
let brackets = 0;
let lineNum = 0;
const maxLine = content.split('\n').length;

for (const line of content.split('\n')) {
  lineNum++;

  for (const char of line) {
    if (char === '(') parentheses++;
    else if (char === ')') parentheses--;
    else if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;

    if (parentheses < 0 || braces < 0 || brackets < 0) {
      console.log(`Unmatched closing at line ${lineNum}: ${line.trim()}`);
      console.log(`Parentheses: ${parentheses}, Braces: ${braces}, Brackets: ${brackets}`);
    }
  }

  // Show progress every 500 lines
  if (lineNum % 500 === 0) {
    console.log(`Line ${lineNum}/${maxLine}: Parentheses: ${parentheses}, Braces: ${braces}, Brackets: ${brackets}`);
  }
}

console.log('\nFinal counts:');
console.log(`Parentheses: ${parentheses}`);
console.log(`Braces: ${braces}`);
console.log(`Brackets: ${brackets}`);

if (parentheses !== 0 || braces !== 0 || brackets !== 0) {
  console.log('\nThere are unmatched brackets!');

  // Let's find the last few unmatched openings
  console.log('\nSearching for unmatched openings...');
  let pCount = 0, bCount = 0, bkCount = 0;
  lineNum = 0;

  for (const line of content.split('\n')) {
    lineNum++;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '(') {
        pCount++;
        if (pCount > 0) console.log(`Line ${lineNum}, col ${i+1}: Opening parenthesis`);
      }
      else if (char === ')') {
        pCount--;
      }
      else if (char === '{') {
        bCount++;
        if (bCount > 0) console.log(`Line ${lineNum}, col ${i+1}: Opening brace`);
      }
      else if (char === '}') {
        bCount--;
      }
      else if (char === '[') {
        bkCount++;
      }
      else if (char === ']') {
        bkCount--;
      }
    }
  }
} else {
  console.log('\nAll brackets are matched!');
}