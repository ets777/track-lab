#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Paths to your translation files
const enFile = path.join(__dirname, '../../src/assets/i18n/en.json');
const ruFile = path.join(__dirname, '../../src/assets/i18n/ru.json');

// Args: node index.js "energy" "энергия"
const [, , enText, ruText] = process.argv;

if (!enText || !ruText) {
    console.error('Usage: node index.js "english text" "russian text"');
    process.exit(1);
}

// Build translation key (uppercased, non-letters -> _)
const key = 'TK_' + enText
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Load existing JSONs
const enJson = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const ruJson = JSON.parse(fs.readFileSync(ruFile, 'utf8'));

// Add or overwrite values
enJson[key] = enText.charAt(0).toUpperCase() + enText.slice(1);
ruJson[key] = ruText.charAt(0).toUpperCase() + ruText.slice(1);

// Save back with pretty formatting
fs.writeFileSync(enFile, JSON.stringify(enJson, null, 2), 'utf8');
fs.writeFileSync(ruFile, JSON.stringify(ruJson, null, 2), 'utf8');

console.log(`✅ Added:
  ${key}: "${enJson[key]}" (EN)
  ${key}: "${ruJson[key]}" (RU)`);
