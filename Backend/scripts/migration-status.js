#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * Migration Status Script
 * 
 * This script shows the current status of database migrations.
 * 
 * Usage: node scripts/migration-status.js [environment]
 */

const environment = process.argv[2] || process.env.NODE_ENV || 'development';

console.log(`📊 Migration status for environment: ${environment}\n`);

async function showMigrationStatus() {
  try {
    // Show migration status
    console.log('Checking migration status...');
    execSync(`npx sequelize-cli db:migrate:status --env ${environment}`, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });

    console.log('\n✅ Migration status retrieved successfully');

  } catch (error) {
    console.error('\n❌ Failed to get migration status:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:', error.stack);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure database server is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Verify database user has necessary permissions');
    
    process.exit(1);
  }
}

// Run the status check
if (require.main === module) {
  showMigrationStatus();
}

module.exports = showMigrationStatus;