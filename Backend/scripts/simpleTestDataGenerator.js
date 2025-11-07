#!/usr/bin/env node

/**
 * Simple Test Data Generator for Enterprise Admin Testing
 * Compatible with @faker-js/faker
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Configuration
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '../test-data');
const USER_COUNT = parseInt(process.env.USER_COUNT) || 100;
const ACTIVITY_COUNT = parseInt(process.env.ACTIVITY_COUNT) || 500;

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

class SimpleTestDataGenerator {
  constructor() {
    this.users = [];
    this.activities = [];
  }

  async generateAll() {
    logSection('Simple Test Data Generation');
    log(`Generating ${USER_COUNT} users and ${ACTIVITY_COUNT} activities`, 'blue');
    
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Generate data
    await this.generateUsers();
    await this.generateActivities();
    
    // Save data
    this.saveData();
    
    // Generate summary
    this.generateSummary();
  }

  async generateUsers() {
    log('\n--- Generating Users ---', 'yellow');
    
    for (let i = 0; i < USER_COUNT; i++) {
      const user = {
        id: i + 1,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        passwordHash: await bcrypt.hash('password123', 12),
        phone: '+1' + faker.string.numeric(10),
        isActive: faker.datatype.boolean(0.85),
        emailVerified: faker.datatype.boolean(0.9),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLogin: faker.datatype.boolean(0.8) ? faker.date.recent() : null,
        
        profile: {
          avatar: faker.image.avatar(),
          bio: faker.lorem.paragraph(),
          website: faker.internet.url(),
          location: faker.location.city() + ', ' + faker.location.country(),
          company: faker.company.name(),
          jobTitle: faker.person.jobTitle(),
        },
        
        subscription: {
          plan: faker.helpers.arrayElement(['basic', 'business', 'enterprise']),
          status: faker.helpers.arrayElement(['active', 'trial', 'past_due']),
          startDate: faker.date.past(),
          endDate: faker.date.future(),
        },
        
        statistics: {
          totalLogins: faker.number.int({ min: 1, max: 500 }),
          averageSessionDuration: faker.number.int({ min: 60, max: 3600 }),
          totalResponses: faker.number.int({ min: 0, max: 100 }),
        },
      };
      
      this.users.push(user);
      
      if ((i + 1) % 20 === 0) {
        log(`    Generated ${i + 1} users...`, 'blue');
      }
    }
    
    log(`  ✅ Generated ${this.users.length} users`, 'green');
  }

  generateActivities() {
    log('\n--- Generating Activities ---', 'yellow');
    
    const activityTypes = [
      'login', 'logout', 'profile_update', 'password_change',
      'subscription_upgrade', 'api_access', 'data_export',
      'report_generation', 'settings_change'
    ];
    
    for (let i = 0; i < ACTIVITY_COUNT; i++) {
      const user = faker.helpers.arrayElement(this.users);
      const activity = {
        id: i + 1,
        userId: user.id,
        type: faker.helpers.arrayElement(activityTypes),
        description: `User ${user.email} performed ${faker.helpers.arrayElement(activityTypes)}`,
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        timestamp: faker.date.recent(),
        severity: faker.helpers.arrayElement(['info', 'warning', 'error']),
        success: faker.datatype.boolean(0.95),
      };
      
      this.activities.push(activity);
      
      if ((i + 1) % 100 === 0) {
        log(`    Generated ${i + 1} activities...`, 'blue');
      }
    }
    
    log(`  ✅ Generated ${this.activities.length} activities`, 'green');
  }

  saveData() {
    log('\n--- Saving Test Data ---', 'yellow');
    
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        userCount: this.users.length,
        activityCount: this.activities.length,
      },
      users: this.users,
      activities: this.activities,
    };
    
    // Save as JSON
    const jsonPath = path.join(OUTPUT_DIR, 'simple-test-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    log(`  ✅ Saved JSON data to ${jsonPath}`, 'green');
    
    // Save CSV files
    this.saveCSV('users', this.users);
    this.saveCSV('activities', this.activities);
  }

  saveCSV(name, data) {
    if (data.length === 0) return;
    
    const csvPath = path.join(OUTPUT_DIR, `${name}.csv`);
    const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object');
    
    let csv = headers.join(',') + '\n';
    
    for (const item of data) {
      const row = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });
      csv += row.join(',') + '\n';
    }
    
    fs.writeFileSync(csvPath, csv);
    log(`  ✅ Saved ${name} CSV to ${csvPath}`, 'green');
  }

  generateSummary() {
    logSection('Test Data Generation Summary');
    
    const activeUsers = this.users.filter(u => u.isActive).length;
    const inactiveUsers = this.users.filter(u => !u.isActive).length;
    
    log(`📊 Generation Summary:`, 'blue');
    log(`  Users: ${this.users.length} (${activeUsers} active, ${inactiveUsers} inactive)`, 'blue');
    log(`  Activities: ${this.activities.length}`, 'blue');
    log(`  Output Directory: ${OUTPUT_DIR}`, 'cyan');
    
    log(`\n📁 Generated Files:`, 'cyan');
    log(`  📄 simple-test-data.json - Complete dataset in JSON format`, 'white');
    log(`  📊 users.csv - User data in CSV format`, 'white');
    log(`  📊 activities.csv - Activity logs in CSV format`, 'white');
    
    log(`\n🎉 Test data generation completed successfully!`, 'green');
  }
}

// Main execution
async function main() {
  log('🏭 Simple Test Data Generator', 'bright');
  log('Generating test data for enterprise admin testing', 'blue');
  
  // Check dependencies
  try {
    require('@faker-js/faker');
    require('bcrypt');
  } catch (error) {
    log('❌ Missing dependencies. Please install: npm install @faker-js/faker bcrypt', 'red');
    process.exit(1);
  }
  
  // Run generator
  const generator = new SimpleTestDataGenerator();
  await generator.generateAll();
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Simple Test Data Generator', 'bright');
  log('\nUsage: node simpleTestDataGenerator.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h              Show this help message', 'blue');
  log('  --users <number>        Number of users to generate (default: 100)', 'blue');
  log('  --activities <number>   Number of activities to generate (default: 500)', 'blue');
  log('  --output-dir <path>     Output directory for generated files (default: ./test-data)', 'blue');
  process.exit(0);
}

// Parse command line arguments
if (args.includes('--users')) {
  const index = args.indexOf('--users');
  process.env.USER_COUNT = args[index + 1];
}

if (args.includes('--activities')) {
  const index = args.indexOf('--activities');
  process.env.ACTIVITY_COUNT = args[index + 1];
}

if (args.includes('--output-dir')) {
  const index = args.indexOf('--output-dir');
  process.env.OUTPUT_DIR = args[index + 1];
}

// Run main function
main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});