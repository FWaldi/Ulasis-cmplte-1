module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  
  // Object and array formatting
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // Line formatting
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  
  // JSX (if needed in the future)
  jsxSingleQuote: true,
  
  // HTML/CSS (if needed in the future)
  htmlWhitespaceSensitivity: 'css',
  
  // Override patterns for specific files
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
  ],
};