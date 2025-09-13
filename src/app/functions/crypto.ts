import CryptoJS from 'crypto-js';

export function encode(content: object, key: string): string {
    const json = JSON.stringify(content);
    return CryptoJS.AES.encrypt(json, key).toString();
}

export function decode(encoded: string, key: string): any {
    const bytes = CryptoJS.AES.decrypt(encoded, key);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(json);
}
