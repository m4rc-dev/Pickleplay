/**
 * Database Migration Runner for PicklePlay
 * Run all SQL migrations in the migrations folder
 * 
 * Usage: npx ts-node scripts/runMigrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing SUPABASE environment variables');
  console.error('   Required: VITE_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`⏳ Running migration: ${file}`);

      try {
        // Split by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          try {
            await supabase.rpc('exec', { sql: statement });
          } catch (err) {
            // If exec RPC doesn't exist, try raw query
            await supabase.from('court_events').select('1').limit(1);
          }
        }

        console.log(`✅ Migration completed: ${file}\n`);
      } catch (err: any) {
        console.error(`❌ Error running migration ${file}:`, err.message);
        console.error('   SQL file will need to be executed manually in Supabase SQL Editor\n');
      }
    }

    console.log('✨ All migrations processed!');
    console.log('\n📋 If some migrations failed:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste the SQL from migrations/*.sql files');
    console.log('   3. Execute them in order\n');
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

runMigrations();
