#!/usr/bin/env node

/**
 * Validates Supabase environment variables format
 * Run: node validate-supabase.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

console.log('🔍 Validating Supabase Configuration...\n');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!\n');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let supabaseUrl = null;
let supabaseKey = null;

lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      supabaseUrl = value;
    }
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      supabaseKey = value;
    }
  }
});

let hasErrors = false;

// Validate URL
if (!supabaseUrl) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
  hasErrors = true;
} else if (supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL contains placeholder text');
  console.log(`   Current value: ${supabaseUrl}`);
  console.log('   ⚠️  You need to replace this with your real Supabase project URL');
  console.log('   Example: https://abcdefghijklmnop.supabase.co\n');
  hasErrors = true;
} else if (!supabaseUrl.startsWith('https://')) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL must start with https://');
  console.log(`   Current value: ${supabaseUrl}\n`);
  hasErrors = true;
} else if (!supabaseUrl.endsWith('.supabase.co')) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL must end with .supabase.co');
  console.log(`   Current value: ${supabaseUrl}\n`);
  hasErrors = true;
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL format looks correct');
  console.log(`   URL: ${supabaseUrl.substring(0, 30)}...\n`);
}

// Validate Key
if (!supabaseKey) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  hasErrors = true;
} else if (supabaseKey.includes('your') || supabaseKey.includes('placeholder') || supabaseKey.length < 50) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder text or is too short');
  console.log(`   Current value: ${supabaseKey.substring(0, 30)}...`);
  console.log('   ⚠️  You need to replace this with your real Supabase anon key');
  console.log('   The key should be very long (200+ characters) and start with eyJ\n');
  hasErrors = true;
} else if (!supabaseKey.startsWith('eyJ')) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY should start with "eyJ" (JWT format)');
  console.log(`   Current value starts with: ${supabaseKey.substring(0, 10)}...\n`);
  hasErrors = true;
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY format looks correct');
  console.log(`   Key length: ${supabaseKey.length} characters\n`);
}

if (hasErrors) {
  console.log('📖 See QUICK_SUPABASE_SETUP.md for detailed setup instructions.\n');
  process.exit(1);
} else {
  console.log('✅ All Supabase configuration looks good!');
  console.log('💡 If you still see errors, make sure:');
  console.log('   1. Your Supabase project is active (not paused)');
  console.log('   2. You restarted your dev server after updating .env.local');
  console.log('   3. Your internet connection is working\n');
}
