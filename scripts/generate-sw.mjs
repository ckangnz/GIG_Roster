/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env files (Vite convention)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const templatePath = path.resolve(__dirname, '../public/firebase-messaging-sw.js.template');
const outputPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');

if (!fs.existsSync(templatePath)) {
  console.error('Service Worker template not found!');
  process.exit(1);
}

let content = fs.readFileSync(templatePath, 'utf8');

const placeholders = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

placeholders.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.warn(`Warning: Environment variable ${key} is missing.`);
  }
  // Replace placeholders like YOUR_API_KEY or __VITE_FIREBASE_API_KEY__
  // I will update the template to use specific placeholder format for robustness
  content = content.replace(new RegExp(`__${key}__`, 'g'), value || '');
});

fs.writeFileSync(outputPath, content);
console.log('Successfully generated public/firebase-messaging-sw.js');
