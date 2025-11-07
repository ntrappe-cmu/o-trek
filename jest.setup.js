// Polyfills for globals used by jsdom / whatwg-url
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Optional: set a window.fetch mock or other globals here if needed
