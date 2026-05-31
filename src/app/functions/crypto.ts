import CryptoJS from 'crypto-js';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function encode(content: object, key: string): string {
  const json = JSON.stringify(content);
  return CryptoJS.AES.encrypt(json, key).toString();
}

export function decode(encoded: string, key: string): any {
  const bytes = CryptoJS.AES.decrypt(encoded, key);
  const json = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(json);
}
