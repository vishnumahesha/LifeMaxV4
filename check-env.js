#!/usr/bin/env node

/**
 * Quick script to check if Supabase environment variables are set
 * Run: node check-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

console.log('🔍 Checking Supabase Configuration...\n');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('📝 Create a .env.local file in the lifemax-app directory.\n');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': false,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': false,
};

lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key] = trimmed.split('=');
    if (requiredVars.hasOwnProperty(key)) {
      requiredVars[key] = true;
    }
  }
});

let allSet = true;
console.log('Environment Variables Status:\n');

Object.entries(requiredVars).forEach(([key, isSet]) => {
  if (isSet) {
    console.log(`✅ ${key} - Set`);
  } else {
    console.log(`❌ ${key} - Missing`);
    allSet = false;
  }
});

console.log('');

if (allSet) {
  console.log('✅ All required Supabase variables are set!');
  console.log('💡 If you still see errors, make sure:');
  console.log('   1. The values are correct (no extra spaces/quotes)');
  console.log('   2. You restarted your dev server after adding them');
  console.log('   3. Your Supabase project is active\n');
} else {
  console.log('❌ Missing required environment variables!');
  console.log('\n📖 See SUPABASE_SETUP.md for setup instructions.\n');
  process.exit(1);
}
