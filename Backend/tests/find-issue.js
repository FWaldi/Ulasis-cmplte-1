const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');

let parentheses = 0;
let braces = 0;
let brackets = 0;
let lineNum = 0;
let foundIssue = false;

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
      console.log(`Before: Parentheses: ${beforeParentheses}, Braces: ${beforeBraces}, Brackets: ${beforeBrackets}`);
      console.log(`After: Parentheses: ${parentheses}, Braces: ${braces}, Brackets: ${brackets}`);
      foundIssue = true;
      break;
    }
  }

  // Show significant changes in bracket counts
  if (Math.abs(parentheses - beforeParentheses) > 0 || Math.abs(braces - beforeBraces) > 0) {
    if (parentheses > 5 || braces > 5) {
      console.log(`Line ${lineNum}: High counts - Parentheses: ${parentheses}, Braces: ${braces}`);
      console.log(`  Content: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
    }
  }

  if (foundIssue) break;
}

if (!foundIssue) {
  console.log(`\nFinal counts after line ${lineNum}:`);
  console.log(`Parentheses: ${parentheses}`);
  console.log(`Braces: ${braces}`);
  console.log(`Brackets: ${brackets}`);

  if (parentheses !== 0 || braces !== 0 || brackets !== 0) {
    console.log('\nUnmatched brackets found at end of file!');
  }
}