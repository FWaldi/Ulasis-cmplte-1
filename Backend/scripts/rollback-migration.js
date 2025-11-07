#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

/**
 * Migration Rollback Script
 * 
 * This script rolls back the last database migration
 * with confirmation and proper error handling.
 * 
 * Usage: node scripts/rollback-migration.js [environment]
 */

const environment = process.argv[2] || process.env.NODE_ENV || 'development';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmRollback() {
  return new Promise((resolve) => {
    rl.question('⚠️  Are you sure you want to rollback the last migration? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function rollbackMigration() {
  console.log(`🔄 Rolling back database migration for environment: ${environment}\n`);

  try {
    // Confirm rollback
    const confirmed = await confirmRollback();
    if (!confirmed) {
      console.log('❌ Rollback cancelled by user');
      process.exit(0);
    }

    // Check current migration status
    console.log('1. Checking current migration status...');
    try {
      execSync(`npx sequelize-cli db:migrate:status --env ${environment}`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      console.warn('⚠️  Could not check migration status:', error.message);
    }

    // Rollback migration
    console.log('\n2. Rolling back last migration...');
    try {
      execSync(`npx sequelize-cli db:migrate:undo --env ${environment}`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
      console.log('\n✅ Migration rolled back successfully');
    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      process.exit(1);
    }

    // Show updated migration status
    console.log('\n3. Updated migration status...');
    try {
      execSync(`npx sequelize-cli db:migrate:status --env ${environment}`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      console.warn('⚠️  Could not check migration status:', error.message);
    }

    console.log('\n🎉 Rollback completed successfully!');

  } catch (error) {
    console.error('\n❌ Rollback process failed:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:', error.stack);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure database server is running');
    console.log('2. Check if there are migrations to rollback');
    console.log('3. Verify database user has necessary permissions');
    console.log('4. Check for foreign key constraints that might prevent rollback');
    
    process.exit(1);
  }
}

// Run the rollback
if (require.main === module) {
  rollbackMigration();
}

module.exports = rollbackMigration;