const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');

let parentheses = 0;
let braces = 0;
let brackets = 0;
let lineNum = 0;
const problemLines = [];

for (const line of content.split('\n')) {
  lineNum++;
  const lineParentheses = parentheses;
  const lineBraces = braces;
  const lineBrackets = brackets;

  for (const char of line) {
    if (char === '(') parentheses++;
    else if (char === ')') parentheses--;
    else if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;

    if (parentheses < 0 || braces < 0 || brackets < 0) {
      console.log(`Unmatched closing at line ${lineNum}: ${line.trim()}`);
      console.log(`Before: Parentheses: ${lineParentheses}, Braces: ${lineBraces}, Brackets: ${lineBrackets}`);
      console.log(`After: Parentheses: ${parentheses}, Braces: ${braces}, Brackets: ${brackets}`);
      process.exit(1);
    }
  }

  // Store lines where counts change
  if (parentheses !== lineParentheses || braces !== lineBraces || brackets !== lineBrackets) {
    problemLines.push({
      line: lineNum,
      content: line.trim(),
      parentheses,
      braces,
      brackets,
    });
  }
}

console.log('\nFinal counts:');
console.log(`Parentheses: ${parentheses}`);
console.log(`Braces: ${braces}`);
console.log(`Brackets: ${brackets}`);

if (parentheses !== 0 || braces !== 0 || brackets !== 0) {
  console.log('\nThere are unmatched brackets!');
  console.log('\nLast 10 lines with bracket changes:');
  problemLines.slice(-10).forEach(item => {
    console.log(`Line ${item.line}: ${item.content}`);
    console.log(`  Counts: Parentheses: ${item.parentheses}, Braces: ${item.braces}, Brackets: ${item.brackets}`);
  });
} else {
  console.log('\nAll brackets are matched!');
}