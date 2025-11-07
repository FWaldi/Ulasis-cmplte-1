const fs = require('fs');

const content = fs.readFileSync('setup.js', 'utf8');
const lines = content.split('\n');

// Find all jest.mock calls and determine correct ending
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if this line starts a jest.mock call
  if (line.trim().startsWith('jest.mock(')) {
    // Check if it uses () => { or () => ({
    if (line.includes('() => {') && !line.includes('() => ({')) {
      // This uses regular function, should end with });
      console.log(`Line ${i + 1}: jest.mock with () => { - should end with });`);
    } else if (line.includes('() => ({') || line.includes('() => ({')) {
      // This uses object return, should end with }));
      console.log(`Line ${i + 1}: jest.mock with () => ({ - should end with }));`);
    }
  }
}