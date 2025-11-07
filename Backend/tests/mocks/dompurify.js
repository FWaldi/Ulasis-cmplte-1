/**
 * Mock for DOMPurify to avoid Jest import issues
 */

const mockDOMPurify = {
  sanitize: (content, options = {}) => {
    // Simple mock sanitization for testing
    if (typeof content === 'string') {
      // Remove basic HTML tags for testing
      return content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    return content;
  },

  addHook: () => {},
  removeHook: () => {},
  setConfig: () => {},
  clearConfig: () => {},
  isValidAttribute: () => true,
  removeHook: () => {},
};

module.exports = mockDOMPurify;