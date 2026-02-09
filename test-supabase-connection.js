#!/usr/bin/env node

/**
 * Test Supabase connection
 * Run: node test-supabase-connection.js
 */

const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
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
}

// Values are read from .env.local above

console.log('🔍 Testing Supabase Connection...\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env.local');
  console.log('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.\n');
  process.exit(1);
}

if (supabaseUrl.includes('your-project') || supabaseKey.includes('your')) {
  console.log('❌ You still have placeholder values!');
  console.log('   Please replace them with your real Supabase credentials.\n');
  console.log('   See SETUP_SUPABASE_NOW.md for instructions.\n');
  process.exit(1);
}

console.log('📡 Testing connection to:', supabaseUrl.substring(0, 30) + '...\n');

// Simple fetch test
fetch(`${supabaseUrl}/rest/v1/`, {
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  },
})
  .then(response => {
    if (response.ok) {
      console.log('✅ Connection successful!');
      console.log('   Your Supabase project is active and reachable.\n');
      console.log('💡 Next steps:');
      console.log('   1. Make sure you ran the SQL migration (002_calorie_tracker.sql)');
      console.log('   2. Restart your dev server: npm run dev');
      console.log('   3. Try signing up at http://localhost:3000/auth\n');
    } else {
      console.log('❌ Connection failed with status:', response.status);
      console.log('   This might mean:');
      console.log('   - Your Supabase project is paused');
      console.log('   - Your credentials are incorrect');
      console.log('   - There\'s a network issue\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.log('❌ Connection error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('   This means the Supabase URL is invalid or the domain doesn\'t exist.');
      console.log('   Make sure you copied the full URL from Supabase dashboard.\n');
    } else {
      console.log('   Check your internet connection and try again.\n');
    }
    process.exit(1);
  });
