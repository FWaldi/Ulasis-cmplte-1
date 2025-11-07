#!/usr/bin/env node

require('dotenv').config();

const databaseConfig = require('../src/config/database');
const logger = require('../src/utils/logger');

/**
 * Database Connection Test Script
 * 
 * This script tests the database connection and configuration.
 * Run it with: node scripts/test-db-connection.js
 */

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test 1: Basic Authentication
    console.log('1. Testing database authentication...');
    const authResult = await databaseConfig.authenticate();
    
    if (authResult) {
      console.log('✅ Database authentication successful');
    } else {
      console.log('❌ Database authentication failed');
      process.exit(1);
    }
    
    // Test 2: Health Check
    console.log('\n2. Testing database health...');
    const healthResult = await databaseConfig.healthCheck();
    
    if (healthResult.status === 'healthy') {
      console.log('✅ Database health check passed');
    } else {
      console.log('❌ Database health check failed:', healthResult.message);
      process.exit(1);
    }
    
    // Test 3: Connection Pool Info
    console.log('\n3. Checking connection pool status...');
    const poolInfo = databaseConfig.getConnectionPoolInfo();
    console.log('📊 Connection Pool Info:', JSON.stringify(poolInfo, null, 2));
    
    // Test 4: Simple Query Test
    console.log('\n4. Testing simple query execution...');
    const { sequelize } = databaseConfig;
    const [results] = await sequelize.query('SELECT 1 as test_value');
    
    if (results && results[0] && results[0].test_value === 1) {
      console.log('✅ Simple query test passed');
    } else {
      console.log('❌ Simple query test failed');
      process.exit(1);
    }
    
    // Test 5: Configuration Validation
    console.log('\n5. Validating database configuration...');
    const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      console.log('✅ Database configuration is valid');
    } else {
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      process.exit(1);
    }
    
    console.log('\n🎉 All database tests passed successfully!');
    console.log('📋 Summary:');
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Database: ${process.env.DB_NAME}`);
    console.log(`   - Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    console.log(`   - Pool Status: ${poolInfo.status}`);
    
  } catch (error) {
    console.error('\n❌ Database connection test failed:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:', error.stack);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure MySQL server is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Verify database exists and user has permissions');
    console.log('4. Check network connectivity to database server');
    
    process.exit(1);
  } finally {
    // Close the connection
    await databaseConfig.close();
    console.log('\n🔐 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = testDatabaseConnection;