/**
 * Base64 utilities for React Native
 * React Native doesn't have atob/btoa, so we provide polyfills
 */

// Polyfill for atob (base64 decode)
export const base64Decode = (str: string): string => {
  // Check if running in browser with native atob
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  
  // React Native polyfill
  const base64abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let buffer = 0;
  let bitsCollected = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '=') break;
    
    const charIndex = base64abc.indexOf(char);
    if (charIndex === -1) continue;
    
    buffer = (buffer << 6) | charIndex;
    bitsCollected += 6;
    
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      result += String.fromCharCode((buffer >> bitsCollected) & 0xff);
    }
  }
  
  return result;
};

// Polyfill for btoa (base64 encode)
export const base64Encode = (str: string): string => {
  // Check if running in browser with native btoa
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  
  // React Native polyfill
  const base64abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let buffer = 0;
  let bitsCollected = 0;
  
  for (let i = 0; i < str.length; i++) {
    buffer = (buffer << 8) | str.charCodeAt(i);
    bitsCollected += 8;
    
    while (bitsCollected >= 6) {
      bitsCollected -= 6;
      result += base64abc[(buffer >> bitsCollected) & 0x3f];
    }
  }
  
  if (bitsCollected > 0) {
    buffer <<= (6 - bitsCollected);
    result += base64abc[buffer & 0x3f];
  }
  
  while (result.length % 4) {
    result += '=';
  }
  
  return result;
};

