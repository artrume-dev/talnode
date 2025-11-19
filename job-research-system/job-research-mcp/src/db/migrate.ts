#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Runs SQL migration files in order to update the database schema.
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine paths - works from both src and dist
const mcpRoot = join(__dirname, '../..');
const DB_PATH = join(mcpRoot, 'data', 'jobs.db');
const MIGRATIONS_DIR = join(mcpRoot, 'src/db/migrations');

function runMigrations() {
  console.log('🔄 Starting database migration...\n');

  // Open database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get list of migration files
  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${migrationFiles.length} migration file(s)\n`);

  // Get already applied migrations
  const appliedMigrations = db.prepare('SELECT migration_name FROM schema_migrations').all() as Array<{ migration_name: string }>;
  const appliedSet = new Set(appliedMigrations.map(m => m.migration_name));

  let appliedCount = 0;
  let skippedCount = 0;

  // Run each migration
  for (const file of migrationFiles) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  Skipping ${file} (already applied)`);
      skippedCount++;
      continue;
    }

    console.log(`📝 Applying ${file}...`);

    try {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

      // Execute migration in a transaction
      const transaction = db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run(file);
      });

      transaction();

      console.log(`✅ Successfully applied ${file}\n`);
      appliedCount++;
    } catch (error) {
      console.error(`❌ Failed to apply ${file}:`);
      console.error(error);
      process.exit(1);
    }
  }

  db.close();

  console.log('\n✨ Migration complete!');
  console.log(`   Applied: ${appliedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${migrationFiles.length}\n`);
}

// Run migrations
runMigrations();
