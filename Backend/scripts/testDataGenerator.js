#!/usr/bin/env node

/**
 * Enterprise Admin Test Data Generator
 * 
 * This script generates realistic test data for enterprise admin testing,
 * including users, activities, security incidents, and analytics data.
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Configuration
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '../test-data');
const USER_COUNT = parseInt(process.env.USER_COUNT) || 1000;
const ACTIVITY_COUNT = parseInt(process.env.ACTIVITY_COUNT) || 5000;
const INCIDENT_COUNT = parseInt(process.env.INCIDENT_COUNT) || 100;
const ANALYTICS_DAYS = parseInt(process.env.ANALYTICS_DAYS) || 365;

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

function logSubsection(title) {
  log(`\n--- ${title} ---`, 'yellow');
}

class TestDataGenerator {
  constructor() {
    this.users = [];
    this.activities = [];
    this.incidents = [];
    this.analytics = [];
    this.adminUsers = [];
    this.roles = [];
  }

  async generateAll() {
    logSection('Enterprise Admin Test Data Generation');
    log(`Generating ${USER_COUNT} users, ${ACTIVITY_COUNT} activities, ${INCIDENT_COUNT} incidents`, 'blue');
    
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Generate data
    await this.generateRoles();
    await this.generateAdminUsers();
    await this.generateUsers();
    await this.generateActivities();
    await this.generateSecurityIncidents();
    await this.generateAnalytics();
    
    // Save data
    this.saveData();
    
    // Generate summary
    this.generateSummary();
  }

  async generateRoles() {
    logSubsection('Generating Admin Roles');
    
    this.roles = [
      {
        id: 1,
        name: 'Super Admin',
        permissions: ['*'],
        level: 10,
        description: 'Full system access with all permissions',
        createdAt: faker.date.past(2),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'Admin',
        permissions: [
          'users:read', 'users:write', 'users:delete',
          'analytics:read', 'reports:read',
          'security:read', 'audit:read'
        ],
        level: 7,
        description: 'Administrative access for user and content management',
        createdAt: faker.date.past(2),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: 'Analyst',
        permissions: [
          'users:read', 'analytics:read', 'reports:read'
        ],
        level: 4,
        description: 'Read-only access for analytics and reporting',
        createdAt: faker.date.past(2),
        updatedAt: new Date(),
      },
      {
        id: 4,
        name: 'Support',
        permissions: [
          'users:read', 'users:write', 'analytics:read'
        ],
        level: 3,
        description: 'Limited access for user support',
        createdAt: faker.date.past(2),
        updatedAt: new Date(),
      },
    ];
    
    log(`  ✅ Generated ${this.roles.length} admin roles`, 'green');
  }

  async generateAdminUsers() {
    logSubsection('Generating Admin Users');
    
    const adminUserData = [
      {
        id: 1,
        email: 'admin@ulasis.com',
        firstName: 'Super',
        lastName: 'Admin',
        password: 'password123',
        roleId: 1,
        isActive: true,
        twoFactorEnabled: false,
        lastLogin: faker.date.recent(7),
      },
      {
        id: 2,
        email: 'manager@ulasis.com',
        firstName: 'Manager',
        lastName: 'Admin',
        password: 'password123',
        roleId: 2,
        isActive: true,
        twoFactorEnabled: true,
        lastLogin: faker.date.recent(1),
      },
      {
        id: 3,
        email: 'analyst@ulasis.com',
        firstName: 'Data',
        lastName: 'Analyst',
        password: 'password123',
        roleId: 3,
        isActive: true,
        twoFactorEnabled: false,
        lastLogin: faker.date.recent(3),
      },
      {
        id: 4,
        email: 'support@ulasis.com',
        firstName: 'Support',
        lastName: 'Agent',
        password: 'password123',
        roleId: 4,
        isActive: true,
        twoFactorEnabled: false,
        lastLogin: faker.date.recent(2),
      },
    ];
    
    for (const adminData of adminUserData) {
      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      
      this.adminUsers.push({
        id: adminData.id,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        passwordHash: hashedPassword,
        isActive: adminData.isActive,
        createdAt: faker.date.past(1),
        updatedAt: new Date(),
        adminUser: {
          id: adminData.id,
          roleId: adminData.roleId,
          isActive: adminData.isActive,
          twoFactorEnabled: adminData.twoFactorEnabled,
          twoFactorSecret: adminData.twoFactorEnabled ? faker.string.alphanumeric(32) : null,
          lastLogin: adminData.lastLogin,
          createdAt: faker.date.past(1),
          updatedAt: new Date(),
        },
      });
    }
    
    log(`  ✅ Generated ${this.adminUsers.length} admin users`, 'green');
  }

  async generateUsers() {
    logSubsection('Generating Regular Users');
    
    const subscriptionPlans = ['basic', 'business', 'enterprise'];
    const subscriptionWeights = [0.6, 0.3, 0.1]; // 60% basic, 30% business, 10% enterprise
    
    for (let i = 0; i < USER_COUNT; i++) {
      const subscriptionPlan = this.weightedRandom(subscriptionPlans, subscriptionWeights);
      const isActive = faker.datatype.boolean(0.85); // 85% active users
      
      const user = {
        id: i + 1,
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        passwordHash: await bcrypt.hash('password123', 12),
        phone: faker.phone.phoneNumber(),
        isActive,
        emailVerified: faker.datatype.boolean(0.9),
        createdAt: faker.date.past(2),
        updatedAt: faker.date.recent(30),
        lastLogin: isActive ? faker.date.recent(30) : null,
        
        // Profile information
        profile: {
          avatar: faker.internet.avatar(),
          bio: faker.lorem.paragraph(),
          website: faker.internet.url(),
          location: `${faker.address.city()}, ${faker.address.country()}`,
          company: faker.company.companyName(),
          jobTitle: faker.name.jobTitle(),
          timezone: faker.address.timeZone(),
        },
        
        // Subscription information
        subscription: {
          plan: subscriptionPlan,
          status: isActive ? faker.random.arrayElement(['active', 'trial', 'past_due']) : 'cancelled',
          startDate: faker.date.past(1),
          endDate: faker.date.future(1),
          trialEnds: subscriptionPlan === 'basic' && faker.datatype.boolean(0.2) ? faker.date.future(0.5) : null,
          cancelledAt: !isActive ? faker.date.past(0.5) : null,
          features: this.getFeaturesForPlan(subscriptionPlan),
        },
        
        // Usage statistics
        statistics: {
          totalLogins: faker.datatype.number({ min: 1, max: 500 }),
          averageSessionDuration: faker.datatype.number({ min: 60, max: 3600 }),
          totalResponses: faker.datatype.number({ min: 0, max: 100 }),
          totalQuestionnaires: faker.datatype.number({ min: 0, max: 50 }),
          totalQRCodes: faker.datatype.number({ min: 0, max: 20 }),
          lastActivity: isActive ? faker.date.recent(7) : null,
        },
        
        // Device and browser information
        devices: this.generateDeviceData(),
        
        // Geographic information
        location: {
          country: faker.address.country(),
          city: faker.address.city(),
          timezone: faker.address.timeZone(),
          ip: faker.internet.ip(),
        },
      };
      
      this.users.push(user);
      
      if ((i + 1) % 100 === 0) {
        log(`    Generated ${i + 1} users...`, 'blue');
      }
    }
    
    log(`  ✅ Generated ${this.users.length} users`, 'green');
  }

  generateActivities() {
    logSubsection('Generating User Activities');
    
    const activityTypes = [
      'login', 'logout', 'profile_update', 'password_change',
      'subscription_upgrade', 'subscription_downgrade', 'api_access',
      'data_export', 'report_generation', 'settings_change',
      'questionnaire_create', 'questionnaire_complete', 'qr_code_create',
      'qr_code_scan', 'email_verification', 'password_reset'
    ];
    
    for (let i = 0; i < ACTIVITY_COUNT; i++) {
      const user = faker.random.arrayElement(this.users);
      const activity = {
        id: i + 1,
        userId: user.id,
        type: faker.random.arrayElement(activityTypes),
        description: this.generateActivityDescription(faker.random.arrayElement(activityTypes), user),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        timestamp: faker.date.recent(90),
        severity: faker.random.arrayElement(['info', 'warning', 'error']),
        metadata: this.generateActivityMetadata(faker.random.arrayElement(activityTypes)),
        sessionId: faker.random.alphaNumeric(20),
        duration: faker.datatype.number({ min: 100, max: 10000 }),
        success: faker.datatype.boolean(0.95), // 95% success rate
      };
      
      this.activities.push(activity);
      
      if ((i + 1) % 500 === 0) {
        log(`    Generated ${i + 1} activities...`, 'blue');
      }
    }
    
    log(`  ✅ Generated ${this.activities.length} activities`, 'green');
  }

  generateSecurityIncidents() {
    logSubsection('Generating Security Incidents');
    
    const incidentTypes = [
      'failed_login', 'suspicious_activity', 'data_access',
      'privilege_escalation', 'unauthorized_access', 'malware_detected',
      'brute_force', 'sql_injection_attempt', 'xss_attempt',
      'csrf_attempt', 'session_hijacking', 'data_breach'
    ];
    
    const severityWeights = [0.4, 0.3, 0.2, 0.1]; // 40% low, 30% medium, 20% high, 10% critical
    
    for (let i = 0; i < INCIDENT_COUNT; i++) {
      const severity = this.weightedRandom(['low', 'medium', 'high', 'critical'], severityWeights);
      const status = faker.random.arrayElement(['open', 'investigating', 'resolved']);
      const resolvedAt = status === 'resolved' ? faker.date.recent(7) : null;
      
      const incident = {
        id: i + 1,
        type: faker.random.arrayElement(incidentTypes),
        severity,
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraphs(2),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        userId: faker.datatype.boolean(0.7) ? faker.random.arrayElement(this.users).id : null,
        status,
        createdAt: faker.date.recent(30),
        updatedAt: faker.date.recent(1),
        resolvedAt,
        resolvedBy: resolvedAt ? faker.random.arrayElement(this.adminUsers).id : null,
        resolution: resolvedAt ? faker.lorem.paragraph() : null,
        affectedSystems: faker.random.arrayElements(['authentication', 'database', 'api', 'frontend'], 2),
        mitigationSteps: resolvedAt ? faker.random.arrayElements([
          'blocked_ip', 'password_reset', 'account_locked', 'security_patch',
          'monitoring_enhanced', 'user_notified', 'incident_reported'
        ], 3) : [],
        impact: {
          usersAffected: faker.datatype.number({ min: 0, max: 100 }),
          dataExposed: faker.datatype.boolean(0.1),
          serviceDisruption: faker.datatype.boolean(0.2),
          financialImpact: faker.datatype.boolean(0.05),
        },
      };
      
      this.incidents.push(incident);
    }
    
    log(`  ✅ Generated ${this.incidents.length} security incidents`, 'green');
  }

  generateAnalytics() {
    logSubsection('Generating Analytics Data');
    
    for (let i = 0; i < ANALYTICS_DAYS; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const analytics = {
        date: date.toISOString().split('T')[0],
        users: {
          total: faker.datatype.number({ min: 1000, max: 10000 }),
          active: faker.datatype.number({ min: 500, max: 8000 }),
          new: faker.datatype.number({ min: 10, max: 200 }),
          returning: faker.datatype.number({ min: 200, max: 1000 }),
          retention: faker.datatype.float({ min: 60, max: 95, precision: 0.1 }),
          churnRate: faker.datatype.float({ min: 1, max: 10, precision: 0.1 }),
        },
        sessions: {
          total: faker.datatype.number({ min: 5000, max: 50000 }),
          averageDuration: faker.datatype.number({ min: 120, max: 1800 }),
          bounceRate: faker.datatype.float({ min: 20, max: 60, precision: 0.1 }),
          pagesPerSession: faker.datatype.float({ min: 1.5, max: 5.0, precision: 0.1 }),
        },
        performance: {
          averageResponseTime: faker.datatype.number({ min: 50, max: 500 }),
          p95ResponseTime: faker.datatype.number({ min: 200, max: 1000 }),
          p99ResponseTime: faker.datatype.number({ min: 500, max: 2000 }),
          uptime: faker.datatype.float({ min: 95, max: 99.9, precision: 0.1 }),
          errorRate: faker.datatype.float({ min: 0.1, max: 5, precision: 0.1 }),
          throughput: faker.datatype.number({ min: 100, max: 1000 }),
        },
        business: {
          revenue: faker.datatype.number({ min: 1000, max: 100000 }),
          subscriptions: {
            basic: faker.datatype.number({ min: 100, max: 1000 }),
            business: faker.datatype.number({ min: 50, max: 500 }),
            enterprise: faker.datatype.number({ min: 10, max: 100 }),
          },
          conversionRate: faker.datatype.float({ min: 2, max: 15, precision: 0.1 }),
          averageRevenuePerUser: faker.datatype.number({ min: 10, max: 100 }),
          lifetimeValue: faker.datatype.number({ min: 100, max: 1000 }),
        },
        geographic: this.generateGeographicData(),
        devices: this.generateDeviceAnalytics(),
        features: this.generateFeatureUsage(),
      };
      
      this.analytics.push(analytics);
    }
    
    log(`  ✅ Generated ${this.analytics.length} days of analytics data`, 'green');
  }

  generateDeviceData() {
    return {
      primary: {
        type: faker.random.arrayElement(['desktop', 'mobile', 'tablet']),
        os: faker.random.arrayElement(['Windows', 'macOS', 'Linux', 'iOS', 'Android']),
        browser: faker.random.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        version: faker.system.semver(),
      },
      all: Array.from({ length: faker.datatype.number({ min: 1, max: 5 }) }, () => ({
        type: faker.random.arrayElement(['desktop', 'mobile', 'tablet']),
        os: faker.random.arrayElement(['Windows', 'macOS', 'Linux', 'iOS', 'Android']),
        browser: faker.random.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        firstSeen: faker.date.past(1),
        lastSeen: faker.date.recent(30),
      })),
    };
  }

  generateDeviceAnalytics() {
    return {
      desktop: {
        count: faker.datatype.number({ min: 1000, max: 5000 }),
        percentage: faker.datatype.float({ min: 40, max: 70, precision: 0.1 }),
      },
      mobile: {
        count: faker.datatype.number({ min: 500, max: 3000 }),
        percentage: faker.datatype.float({ min: 20, max: 40, precision: 0.1 }),
      },
      tablet: {
        count: faker.datatype.number({ min: 100, max: 1000 }),
        percentage: faker.datatype.float({ min: 5, max: 15, precision: 0.1 }),
      },
    };
  }

  generateGeographicData() {
    const countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Australia', 'Japan', 'Brazil'];
    return countries.map(country => ({
      country,
      users: faker.datatype.number({ min: 50, max: 1000 }),
      percentage: faker.datatype.float({ min: 1, max: 30, precision: 0.1 }),
    }));
  }

  generateFeatureUsage() {
    return {
      questionnaires: {
        created: faker.datatype.number({ min: 10, max: 100 }),
        completed: faker.datatype.number({ min: 50, max: 500 }),
        averageTime: faker.datatype.number({ min: 300, max: 1800 }),
      },
      qrCodes: {
        generated: faker.datatype.number({ min: 20, max: 200 }),
        scanned: faker.datatype.number({ min: 100, max: 1000 }),
        uniqueScans: faker.datatype.number({ min: 50, max: 500 }),
      },
      analytics: {
        views: faker.datatype.number({ min: 1000, max: 10000 }),
        exports: faker.datatype.number({ min: 10, max: 100 }),
        reports: faker.datatype.number({ min: 5, max: 50 }),
      },
    };
  }

  generateActivityDescription(type, user) {
    const descriptions = {
      login: `User ${user.email} logged in`,
      logout: `User ${user.email} logged out`,
      profile_update: `User ${user.email} updated their profile`,
      password_change: `User ${user.email} changed their password`,
      subscription_upgrade: `User ${user.email} upgraded subscription`,
      subscription_downgrade: `User ${user.email} downgraded subscription`,
      api_access: `User ${user.email} accessed API`,
      data_export: `User ${user.email} exported data`,
      report_generation: `User ${user.email} generated report`,
      settings_change: `User ${user.email} changed settings`,
      questionnaire_create: `User ${user.email} created questionnaire`,
      questionnaire_complete: `User ${user.email} completed questionnaire`,
      qr_code_create: `User ${user.email} created QR code`,
      qr_code_scan: `User ${user.email} scanned QR code`,
      email_verification: `User ${user.email} verified email`,
      password_reset: `User ${user.email} reset password`,
    };
    
    return descriptions[type] || `User ${user.email} performed ${type}`;
  }

  generateActivityMetadata(type) {
    const metadata = {
      login: { method: 'password', ip: faker.internet.ip() },
      profile_update: { fields: ['firstName', 'lastName'] },
      subscription_upgrade: { from: 'basic', to: 'business' },
      api_access: { endpoint: '/api/v1/data', method: 'GET' },
      data_export: { format: 'csv', records: faker.datatype.number({ min: 100, max: 1000 }) },
      report_generation: { type: 'analytics', dateRange: '30d' },
    };
    
    return metadata[type] || {};
  }

  getFeaturesForPlan(plan) {
    const features = {
      basic: ['basic_analytics', 'limited_questionnaires', 'email_support'],
      business: ['advanced_analytics', 'unlimited_questionnaires', 'api_access', 'priority_support'],
      enterprise: ['all_features', 'custom_integrations', 'dedicated_support', 'white_label'],
    };
    
    return features[plan] || features.basic;
  }

  weightedRandom(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  saveData() {
    logSubsection('Saving Test Data');
    
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        userCount: this.users.length,
        activityCount: this.activities.length,
        incidentCount: this.incidents.length,
        analyticsDays: this.analytics.length,
        adminUserCount: this.adminUsers.length,
        roleCount: this.roles.length,
      },
      roles: this.roles,
      adminUsers: this.adminUsers,
      users: this.users,
      activities: this.activities,
      securityIncidents: this.incidents,
      analytics: this.analytics,
    };
    
    // Save as JSON
    const jsonPath = path.join(OUTPUT_DIR, 'test-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    log(`  ✅ Saved JSON data to ${jsonPath}`, 'green');
    
    // Save individual CSV files for easier import
    this.saveCSV('users', this.users);
    this.saveCSV('activities', this.activities);
    this.saveCSV('security-incidents', this.incidents);
    this.saveCSV('analytics', this.analytics);
    
    // Save SQL insert statements
    this.saveSQL();
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

  saveSQL() {
    const sqlPath = path.join(OUTPUT_DIR, 'test-data.sql');
    let sql = '-- Test Data for Enterprise Admin System\n';
    sql += `-- Generated on ${new Date().toISOString()}\n\n`;
    
    // Generate INSERT statements for each table
    sql += this.generateInsertSQL('roles', this.roles);
    sql += this.generateInsertSQL('users', this.users);
    sql += this.generateInsertSQL('activities', this.activities);
    sql += this.generateInsertSQL('security_incidents', this.incidents);
    sql += this.generateInsertSQL('analytics', this.analytics);
    
    fs.writeFileSync(sqlPath, sql);
    log(`  ✅ Saved SQL data to ${sqlPath}`, 'green');
  }

  generateInsertSQL(tableName, data) {
    if (data.length === 0) return '';
    
    const columns = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object');
    let sql = `-- ${tableName}\n`;
    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
    
    const values = data.map(item => {
      const rowValues = columns.map(column => {
        const value = item[column];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      });
      return `(${rowValues.join(', ')})`;
    });
    
    sql += values.join(',\n');
    sql += ';\n\n';
    
    return sql;
  }

  generateSummary() {
    logSection('Test Data Generation Summary');
    
    const summary = {
      generatedAt: new Date().toISOString(),
      outputDirectory: OUTPUT_DIR,
      statistics: {
        users: {
          total: this.users.length,
          active: this.users.filter(u => u.isActive).length,
          inactive: this.users.filter(u => !u.isActive).length,
          bySubscription: {
            basic: this.users.filter(u => u.subscription.plan === 'basic').length,
            business: this.users.filter(u => u.subscription.plan === 'business').length,
            enterprise: this.users.filter(u => u.subscription.plan === 'enterprise').length,
          },
        },
        activities: {
          total: this.activities.length,
          byType: this.activities.reduce((acc, activity) => {
            acc[activity.type] = (acc[activity.type] || 0) + 1;
            return acc;
          }, {}),
        },
        securityIncidents: {
          total: this.incidents.length,
          bySeverity: {
            low: this.incidents.filter(i => i.severity === 'low').length,
            medium: this.incidents.filter(i => i.severity === 'medium').length,
            high: this.incidents.filter(i => i.severity === 'high').length,
            critical: this.incidents.filter(i => i.severity === 'critical').length,
          },
          byStatus: {
            open: this.incidents.filter(i => i.status === 'open').length,
            investigating: this.incidents.filter(i => i.status === 'investigating').length,
            resolved: this.incidents.filter(i => i.status === 'resolved').length,
          },
        },
        analytics: {
          days: this.analytics.length,
          dateRange: {
            start: this.analytics[this.analytics.length - 1]?.date,
            end: this.analytics[0]?.date,
          },
        },
      },
      files: {
        json: 'test-data.json',
        csv: ['users.csv', 'activities.csv', 'security-incidents.csv', 'analytics.csv'],
        sql: 'test-data.sql',
      },
    };
    
    // Save summary
    const summaryPath = path.join(OUTPUT_DIR, 'generation-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    // Display summary
    log(`📊 Generation Summary:`, 'blue');
    log(`  Users: ${summary.statistics.users.total} (${summary.statistics.users.active} active, ${summary.statistics.users.inactive} inactive)`, 'blue');
    log(`  Activities: ${summary.statistics.activities.total}`, 'blue');
    log(`  Security Incidents: ${summary.statistics.securityIncidents.total}`, 'blue');
    log(`  Analytics Days: ${summary.statistics.analytics.days}`, 'blue');
    log(`  Output Directory: ${summary.outputDirectory}`, 'cyan');
    
    log(`\n📁 Generated Files:`, 'cyan');
    log(`  📄 test-data.json - Complete dataset in JSON format`, 'white');
    log(`  📊 users.csv - User data in CSV format`, 'white');
    log(`  📊 activities.csv - Activity logs in CSV format`, 'white');
    log(`  📊 security-incidents.csv - Security incidents in CSV format`, 'white');
    log(`  📊 analytics.csv - Analytics data in CSV format`, 'white');
    log(`  🗄️  test-data.sql - SQL insert statements`, 'white');
    log(`  📋 generation-summary.json - Generation summary and statistics`, 'white');
    
    log(`\n🎉 Test data generation completed successfully!`, 'green');
    log(`\n💡 Next Steps:`, 'magenta');
    log(`  1. Import SQL data into your test database`, 'white');
    log(`  2. Use JSON data for API testing`, 'white');
    log(`  3. Load CSV files into analytics tools`, 'white');
    log(`  4. Run real data testing scripts`, 'white');
  }
}

// Main execution
async function main() {
  log('🏭 Enterprise Admin Test Data Generator', 'bright');
  log('Generating realistic test data for enterprise admin testing', 'blue');
  
  // Check dependencies
  try {
    require('@faker-js/faker');
    require('bcrypt');
  } catch (error) {
    log('❌ Missing dependencies. Please install: npm install @faker-js/faker bcrypt', 'red');
    process.exit(1);
  }
  
  // Run generator
  const generator = new TestDataGenerator();
  await generator.generateAll();
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Enterprise Admin Test Data Generator', 'bright');
  log('\nUsage: node testDataGenerator.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h              Show this help message', 'blue');
  log('  --users <number>         Number of users to generate (default: 1000)', 'blue');
  log('  --activities <number>    Number of activities to generate (default: 5000)', 'blue');
  log('  --incidents <number>     Number of security incidents to generate (default: 100)', 'blue');
  log('  --analytics-days <number> Number of days of analytics data to generate (default: 365)', 'blue');
  log('  --output-dir <path>      Output directory for generated files (default: ./test-data)', 'blue');
  log('\nExamples:', 'yellow');
  log('  node testDataGenerator.js --users 5000 --activities 10000', 'blue');
  log('  node testDataGenerator.js --output-dir /tmp/test-data', 'blue');
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

if (args.includes('--incidents')) {
  const index = args.indexOf('--incidents');
  process.env.INCIDENT_COUNT = args[index + 1];
}

if (args.includes('--analytics-days')) {
  const index = args.indexOf('--analytics-days');
  process.env.ANALYTICS_DAYS = args[index + 1];
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