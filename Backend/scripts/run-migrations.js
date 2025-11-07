#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Migration Runner Script
 * 
 * This script runs database migrations using Sequelize CLI
 * with proper error handling and logging.
 * 
 * Usage: node scripts/run-migrations.js [environment]
 */

const environment = process.argv[2] || process.env.NODE_ENV || 'development';

console.log(`🚀 Running database migrations for environment: ${environment}\n`);

async function runMigrations() {
  try {
    // Check if .env file exists
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
      console.warn('⚠️  Warning: .env file not found. Using default configuration.');
    }

    // Check database connection first
    console.log('1. Checking database connection...');
    try {
      execSync('node scripts/test-db-connection.js', { stdio: 'inherit' });
      console.log('✅ Database connection verified\n');
    } catch (error) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }

    // Run migrations
    console.log('2. Running database migrations...');
    try {
      execSync(`npx sequelize-cli db:migrate --env ${environment}`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
      console.log('\n✅ Migrations completed successfully');
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    }

    // Show migration status
    console.log('\n3. Checking migration status...');
    try {
      execSync(`npx sequelize-cli db:migrate:status --env ${environment}`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      console.warn('⚠️  Could not check migration status:', error.message);
    }

    console.log('\n🎉 Migration process completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration process failed:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:', error.stack);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure database server is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Verify database user has necessary permissions');
    console.log('4. Check if migrations directory exists and contains files');
    
    process.exit(1);
  }
}

// Run the migrations
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;