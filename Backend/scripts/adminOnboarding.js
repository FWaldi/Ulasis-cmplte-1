#!/usr/bin/env node

/**
 * Enterprise Admin Automated Onboarding Script
 * 
 * This script helps new enterprise admin users get set up quickly
 * by creating initial configurations, sample data, and walkthrough guides.
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Configuration
const ONBOARDING_DIR = process.env.ONBOARDING_DIR || path.join(__dirname, '../onboarding');
const TEMPLATES_DIR = path.join(ONBOARDING_DIR, 'templates');
const CHECKLISTS_DIR = path.join(ONBOARDING_DIR, 'checklists');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(70), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

function logSubsection(title) {
  log(`\n--- ${title} ---`, 'yellow');
}

function logStep(step, title) {
  log(`\n${step}. ${title}`, 'blue');
}

function logSuccess(message) {
  log(`  ✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`  ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, 'yellow');
}

class AdminOnboardingAssistant {
  constructor() {
    this.adminInfo = {};
    this.checklist = [];
    this.templates = [];
    this.startTime = Date.now();
  }

  async runOnboarding() {
    logSection('🚀 Enterprise Admin Automated Onboarding');
    log('Welcome to the Ulasis Enterprise Admin onboarding process!', 'blue');
    log('This assistant will help you get set up quickly and efficiently.', 'blue');
    
    try {
      // Create directories
      this.createDirectories();
      
      // Collect admin information
      await this.collectAdminInfo();
      
      // Generate onboarding materials
      await this.generateChecklists();
      await this.generateTemplates();
      await this.generateQuickStartGuide();
      await this.generateSecurityChecklist();
      await this.generateTrainingSchedule();
      
      // Create personalized dashboard setup
      await this.generateDashboardConfig();
      
      // Generate completion report
      this.generateCompletionReport();
      
      logSection('🎉 Onboarding Complete!');
      this.displayNextSteps();
      
    } catch (error) {
      log(`❌ Onboarding failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  createDirectories() {
    logStep('1', 'Creating Onboarding Directories');
    
    const directories = [
      ONBOARDING_DIR,
      TEMPLATES_DIR,
      CHECKLISTS_DIR,
      path.join(ONBOARDING_DIR, 'configs'),
      path.join(ONBOARDING_DIR, 'resources'),
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logSuccess(`Created directory: ${path.basename(dir)}`);
      }
    });
    
    logSuccess('All directories created successfully');
  }

  async collectAdminInfo() {
    logStep('2', 'Collecting Admin Information');
    
    // For demo purposes, use sample data
    // In real implementation, this would collect from user input
    this.adminInfo = {
      name: 'New Admin User',
      email: 'admin@company.com',
      role: 'Admin',
      department: 'IT',
      startDate: new Date().toISOString().split('T')[0],
      manager: 'IT Manager',
      timezone: 'America/New_York',
      preferences: {
        language: 'en',
        notifications: 'immediate',
        reports: 'weekly',
      },
    };
    
    logInfo(`Admin: ${this.adminInfo.name}`);
    logInfo(`Email: ${this.adminInfo.email}`);
    logInfo(`Role: ${this.adminInfo.role}`);
    logInfo(`Department: ${this.adminInfo.department}`);
    logSuccess('Admin information collected');
  }

  async generateChecklists() {
    logStep('3', 'Generating Onboarding Checklists');
    
    // 30-Day Onboarding Checklist
    const day30Checklist = {
      title: '30-Day Onboarding Checklist',
      description: 'Essential tasks to complete in your first 30 days',
      items: [
        {
          category: 'Week 1: Foundation',
          tasks: [
            { task: 'Complete account registration', completed: false, priority: 'high' },
            { task: 'Set up two-factor authentication', completed: false, priority: 'high' },
            { task: 'Review security policies', completed: false, priority: 'high' },
            { task: 'Complete profile configuration', completed: false, priority: 'medium' },
            { task: 'Take dashboard tour', completed: false, priority: 'medium' },
          ]
        },
        {
          category: 'Week 2: Core Features',
          tasks: [
            { task: 'Add test users', completed: false, priority: 'medium' },
            { task: 'Generate first report', completed: false, priority: 'medium' },
            { task: 'Explore analytics dashboard', completed: false, priority: 'medium' },
            { task: 'Configure notifications', completed: false, priority: 'low' },
            { task: 'Review user permissions', completed: false, priority: 'medium' },
          ]
        },
        {
          category: 'Week 3: Advanced Features',
          tasks: [
            { task: 'Set up automated workflows', completed: false, priority: 'low' },
            { task: 'Create custom dashboard', completed: false, priority: 'low' },
            { task: 'Test API access', completed: false, priority: 'low' },
            { task: 'Review audit logs', completed: false, priority: 'medium' },
            { task: 'Complete advanced training', completed: false, priority: 'low' },
          ]
        },
        {
          category: 'Week 4: Optimization',
          tasks: [
            { task: 'Fine-tune notification settings', completed: false, priority: 'low' },
            { task: 'Set up scheduled reports', completed: false, priority: 'low' },
            { task: 'Document custom processes', completed: false, priority: 'low' },
            { task: 'Join community forums', completed: false, priority: 'low' },
            { task: 'Review performance metrics', completed: false, priority: 'medium' },
          ]
        },
      ],
    };
    
    // Security Checklist
    const securityChecklist = {
      title: 'Security Setup Checklist',
      description: 'Essential security configurations for your account',
      items: [
        {
          category: 'Account Security',
          tasks: [
            { task: 'Enable two-factor authentication', completed: false, priority: 'critical' },
            { task: 'Save backup codes securely', completed: false, priority: 'critical' },
            { task: 'Review login activity', completed: false, priority: 'high' },
            { task: 'Set up session timeout', completed: false, priority: 'medium' },
          ]
        },
        {
          category: 'Data Protection',
          tasks: [
            { task: 'Review data access permissions', completed: false, priority: 'high' },
            { task: 'Understand data retention policies', completed: false, priority: 'medium' },
            { task: 'Set up data export restrictions', completed: false, priority: 'medium' },
            { task: 'Configure audit logging', completed: false, priority: 'high' },
          ]
        },
        {
          category: 'Monitoring',
          tasks: [
            { task: 'Set up security alerts', completed: false, priority: 'high' },
            { task: 'Configure failed login monitoring', completed: false, priority: 'medium' },
            { task: 'Review security incident procedures', completed: false, priority: 'medium' },
            { task: 'Test emergency contact procedures', completed: false, priority: 'low' },
          ]
        },
      ],
    };
    
    // Save checklists
    const checklists = [day30Checklist, securityChecklist];
    
    checklists.forEach((checklist, index) => {
      const filename = `checklist-${index + 1}-${checklist.title.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filepath = path.join(CHECKLISTS_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(checklist, null, 2));
      logSuccess(`Created checklist: ${checklist.title}`);
    });
    
    this.checklists = checklists;
  }

  async generateTemplates() {
    logStep('4', 'Generating Communication Templates');
    
    // Welcome Email Template
    const welcomeEmailTemplate = {
      name: 'Welcome Email Template',
      type: 'email',
      subject: 'Welcome to Ulasis Enterprise Admin Team!',
      body: `Dear ${this.adminInfo.name},

Welcome to the Ulasis Enterprise Admin team! We're excited to have you join us as ${this.adminInfo.role}.

Your onboarding journey begins today, and we're here to support you every step of the way.

📋 Your First Week:
1. Complete your profile setup
2. Enable two-factor authentication
3. Review the security policies
4. Take the interactive dashboard tour

📚 Resources Available:
- Admin Dashboard Guide: [Link to documentation]
- Video Tutorials: [Link to training videos]
- Community Forum: [Link to community]
- Support Team: support@ulasis.com

🚀 Quick Start:
- Login URL: https://admin.ulasis.com
- Your email: ${this.adminInfo.email}
- Temporary password: [Will be sent separately]

If you have any questions, don't hesitate to reach out to your manager, ${this.adminInfo.manager}, or the support team.

Best regards,
The Ulasis Team`,
    };
    
    // User Invitation Template
    const userInvitationTemplate = {
      name: 'User Invitation Template',
      type: 'email',
      subject: 'Invitation to Join Ulasis Platform',
      body: `Hello [User Name],

You've been invited to join the Ulasis platform!

🔗 Get Started:
Click here to accept your invitation: [Invitation Link]

📝 Next Steps:
1. Create your account using this email: [User Email]
2. Set up your password
3. Complete your profile
4. Explore the dashboard

If you have any questions, please contact our support team.

Best regards,
${this.adminInfo.name}
${this.adminInfo.role}`,
    };
    
    // Report Template
    const reportTemplate = {
      name: 'Weekly Admin Report Template',
      type: 'report',
      sections: [
        {
          title: 'Executive Summary',
          content: 'Key metrics and highlights for the week',
        },
        {
          title: 'User Analytics',
          metrics: ['Total Users', 'Active Users', 'New Registrations', 'User Retention'],
        },
        {
          title: 'System Performance',
          metrics: ['Uptime', 'Response Time', 'Error Rate', 'Resource Usage'],
        },
        {
          title: 'Security Overview',
          metrics: ['Failed Logins', 'Security Incidents', 'Audit Logs Reviewed'],
        },
        {
          title: 'Action Items',
          content: 'Tasks and priorities for the upcoming week',
        },
      ],
    };
    
    const templates = [welcomeEmailTemplate, userInvitationTemplate, reportTemplate];
    
    templates.forEach(template => {
      const filename = `${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filepath = path.join(TEMPLATES_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(template, null, 2));
      logSuccess(`Created template: ${template.name}`);
    });
    
    this.templates = templates;
  }

  async generateQuickStartGuide() {
    logStep('5', 'Generating Quick Start Guide');
    
    const quickStartGuide = `# Quick Start Guide for ${this.adminInfo.name}

## Welcome to Ulasis Enterprise Admin!

This personalized guide will help you get up and running quickly.

## Your Account Information
- **Name**: ${this.adminInfo.name}
- **Email**: ${this.adminInfo.email}
- **Role**: ${this.adminInfo.role}
- **Department**: ${this.adminInfo.department}
- **Manager**: ${this.adminInfo.manager}
- **Start Date**: ${this.adminInfo.startDate}

## Day 1: Getting Started

### Morning (9:00 AM - 12:00 PM)
1. **Login to Dashboard** (15 minutes)
   - Go to: https://admin.ulasis.com
   - Use your company email and password
   - Complete two-factor authentication setup

2. **Profile Setup** (20 minutes)
   - Upload professional photo
   - Add your bio and contact information
   - Set your timezone and language preferences

3. **Security Setup** (25 minutes)
   - Review security policies
   - Save backup codes
   - Configure session timeout

### Afternoon (1:00 PM - 5:00 PM)
1. **Dashboard Tour** (30 minutes)
   - Complete interactive tour
   - Explore main sections
   - Try quick actions

2. **User Management** (45 minutes)
   - Review user interface
   - Try searching for users
   - Practice filtering and sorting

3. **Generate First Report** (30 minutes)
   - Navigate to Reports section
   - Generate a basic user report
   - Export to PDF

## Day 2-3: Core Features

### User Management
- Add 2-3 test users
- Practice user permissions
- Try bulk operations

### Analytics
- Explore dashboard metrics
- Create custom views
- Set up basic alerts

### Security
- Review security logs
- Set up monitoring
- Test incident response

## Week 1 Goals
- [ ] Complete all security setup
- [ ] Add 5+ test users
- [ ] Generate 3+ reports
- [ ] Customize dashboard
- [ ] Join community forum

## Week 2 Goals
- [ ] Set up automated workflows
- [ ] Create custom reports
- [ ] Master user management
- [ ] Review all permissions

## Support Resources

### Immediate Help
- **Chat Support**: Available in dashboard
- **Email**: support@ulasis.com
- **Phone**: 1-800-ULASIS-1

### Documentation
- [Admin Dashboard Guide](./ENTERPRISE_ADMIN_DASHBOARD.md)
- [API Documentation](./ENTERPRISE_ADMIN_API.md)
- [Security Policies](./SECURITY_POLICIES.md)

### Training
- [Video Library](https://training.ulasis.com)
- [Interactive Demos](https://demo.ulasis.com)
- [Knowledge Base](https://kb.ulasis.com)

## Your Personal Checklist

### Security Setup
- [ ] Enable 2FA
- [ ] Save backup codes
- [ ] Review security policies
- [ ] Set up alerts

### Profile Configuration
- [ ] Upload photo
- [ ] Complete bio
- [ ] Set timezone
- [ ] Configure notifications

### First Tasks
- [ ] Complete dashboard tour
- [ ] Add test users
- [ ] Generate report
- [ ] Explore analytics

## Common Questions

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page or contact IT support.

**Q: Who do I contact for help?**
A: Start with the in-app chat, then email support@ulasis.com.

**Q: How do I get additional permissions?**
A: Contact your manager or IT administrator.

**Q: Where can I find training materials?**
A: Check the Resources section in your dashboard.

## Success Tips

1. **Take Notes**: Document your processes and questions
2. **Ask Questions**: No question is too small
3. **Explore**: Try different features and options
4. **Connect**: Join the community forums
5. **Practice**: Use test data to learn features

## Next Steps

After completing this guide:
1. Review your 30-day checklist
2. Schedule training sessions
3. Connect with other admins
4. Set your learning goals

---

**Generated on**: ${new Date().toLocaleDateString()}  
**Valid for**: First 30 days of employment  
**Contact**: ${this.adminInfo.manager} or support@ulasis.com

Good luck and welcome to the team! 🎉`;

    const guidePath = path.join(ONBOARDING_DIR, 'quick-start-guide.md');
    fs.writeFileSync(guidePath, quickStartGuide);
    logSuccess('Quick start guide created');
  }

  async generateSecurityChecklist() {
    logStep('6', 'Generating Security Configuration');
    
    const securityConfig = {
      admin: this.adminInfo.email,
      role: this.adminInfo.role,
      generatedAt: new Date().toISOString(),
      securitySettings: {
        authentication: {
          twoFactorEnabled: true,
          backupCodesGenerated: false,
          sessionTimeout: 30, // minutes
          maxLoginAttempts: 5,
          lockoutDuration: 15, // minutes
        },
        permissions: {
          userManagement: true,
          analytics: true,
          security: true,
          reports: true,
          settings: false, // Requires senior admin
        },
        monitoring: {
          loginAlerts: true,
          failedLoginThreshold: 3,
          dataExportAlerts: true,
          permissionChangeAlerts: true,
        },
        dataProtection: {
          exportRestrictions: true,
          auditLogging: true,
          dataRetention: '7 years',
          encryptionEnabled: true,
        },
      },
      actionItems: [
        'Enable two-factor authentication immediately',
        'Save backup codes in secure location',
        'Review and understand data access permissions',
        'Set up security alerts and notifications',
        'Complete security training module',
        'Review emergency contact procedures',
        'Test incident response workflow',
        'Document custom security procedures',
      ],
    };
    
    const configPath = path.join(ONBOARDING_DIR, 'configs', 'security-config.json');
    fs.writeFileSync(configPath, JSON.stringify(securityConfig, null, 2));
    logSuccess('Security configuration created');
  }

  async generateTrainingSchedule() {
    logStep('7', 'Creating Training Schedule');
    
    const trainingSchedule = {
      admin: this.adminInfo.name,
      role: this.adminInfo.role,
      startDate: this.adminInfo.startDate,
      schedule: [
        {
          week: 1,
          title: 'Foundation Training',
          modules: [
            { name: 'System Overview', duration: '30 minutes', type: 'video' },
            { name: 'Security Basics', duration: '45 minutes', type: 'interactive' },
            { name: 'Dashboard Navigation', duration: '20 minutes', type: 'hands-on' },
            { name: 'User Management Basics', duration: '40 minutes', type: 'video' },
          ],
          assessments: ['Security Quiz', 'Navigation Test'],
        },
        {
          week: 2,
          title: 'Core Features',
          modules: [
            { name: 'Advanced User Management', duration: '60 minutes', type: 'hands-on' },
            { name: 'Analytics and Reporting', duration: '45 minutes', type: 'video' },
            { name: 'Security Monitoring', duration: '30 minutes', type: 'interactive' },
            { name: 'Troubleshooting Basics', duration: '25 minutes', type: 'video' },
          ],
          assessments: ['User Management Practical', 'Report Generation Test'],
        },
        {
          week: 3,
          title: 'Advanced Features',
          modules: [
            { name: 'Automation and Workflows', duration: '50 minutes', type: 'hands-on' },
            { name: 'API Integration', duration: '40 minutes', type: 'technical' },
            { name: 'Custom Dashboards', duration: '35 minutes', type: 'hands-on' },
            { name: 'Advanced Security', duration: '45 minutes', type: 'interactive' },
          ],
          assessments: ['Automation Project', 'Security Scenario Test'],
        },
        {
          week: 4,
          title: 'Mastery and Optimization',
          modules: [
            { name: 'Performance Optimization', duration: '30 minutes', type: 'video' },
            { name: 'Best Practices', duration: '25 minutes', type: 'workshop' },
            { name: 'Community Contribution', duration: '20 minutes', type: 'discussion' },
            { name: 'Final Assessment', duration: '60 minutes', type: 'comprehensive' },
          ],
          assessments: ['Final Practical Exam', 'Knowledge Review'],
        },
      ],
      resources: {
        videos: 'https://training.ulasis.com/videos',
        documentation: 'https://docs.ulasis.com',
        community: 'https://community.ulasis.com',
        support: 'support@ulasis.com',
      },
      milestones: [
        { week: 1, goal: 'Complete basic setup and security' },
        { week: 2, goal: 'Master core admin functions' },
        { week: 3, goal: 'Implement advanced features' },
        { week: 4, goal: 'Achieve operational mastery' },
      ],
    };
    
    const schedulePath = path.join(ONBOARDING_DIR, 'training-schedule.json');
    fs.writeFileSync(schedulePath, JSON.stringify(trainingSchedule, null, 2));
    logSuccess('Training schedule created');
  }

  async generateDashboardConfig() {
    logStep('8', 'Creating Dashboard Configuration');
    
    const dashboardConfig = {
      admin: this.adminInfo.name,
      role: this.adminInfo.role,
      preferences: this.adminInfo.preferences,
      layout: {
        theme: 'light',
        language: 'en',
        timezone: this.adminInfo.timezone,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      },
      widgets: [
        {
          id: 'user-overview',
          type: 'metric-card',
          title: 'User Overview',
          position: { row: 1, col: 1 },
          size: { width: 3, height: 2 },
          metrics: ['totalUsers', 'activeUsers', 'newUsers'],
        },
        {
          id: 'system-health',
          type: 'status-card',
          title: 'System Health',
          position: { row: 1, col: 4 },
          size: { width: 2, height: 2 },
          metrics: ['uptime', 'responseTime', 'errorRate'],
        },
        {
          id: 'recent-activities',
          type: 'activity-feed',
          title: 'Recent Activities',
          position: { row: 3, col: 1 },
          size: { width: 4, height: 3 },
          filters: { limit: 10, types: ['login', 'user_update', 'security_event'] },
        },
        {
          id: 'quick-actions',
          type: 'action-buttons',
          title: 'Quick Actions',
          position: { row: 3, col: 5 },
          size: { width: 1, height: 3 },
          actions: ['addUser', 'generateReport', 'securityAudit', 'systemSettings'],
        },
        {
          id: 'analytics-chart',
          type: 'chart',
          title: 'User Analytics',
          position: { row: 6, col: 1 },
          size: { width: 6, height: 4 },
          chartType: 'line',
          metrics: ['userGrowth', 'activeUsers'],
          timeRange: '30d',
        },
      ],
      notifications: {
        email: {
          critical: true,
          warnings: true,
          info: false,
          digest: 'weekly',
        },
        inApp: {
          critical: true,
          warnings: true,
          info: true,
          systemUpdates: true,
        },
      },
      shortcuts: [
        { name: 'Add User', url: '/users/add', icon: 'user-plus' },
        { name: 'Generate Report', url: '/reports/generate', icon: 'chart-bar' },
        { name: 'Security Logs', url: '/security/logs', icon: 'shield' },
        { name: 'System Settings', url: '/settings', icon: 'cog' },
      ],
    };
    
    const configPath = path.join(ONBOARDING_DIR, 'configs', 'dashboard-config.json');
    fs.writeFileSync(configPath, JSON.stringify(dashboardConfig, null, 2));
    logSuccess('Dashboard configuration created');
  }

  generateCompletionReport() {
    logStep('9', 'Generating Onboarding Report');
    
    const report = {
      admin: this.adminInfo,
      onboarding: {
        completedAt: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        version: '2.0',
      },
      generatedFiles: {
        checklists: this.checklists.length,
        templates: this.templates.length,
        guides: 1, // quick start guide
        configs: 2, // security and dashboard
        schedules: 1,
      },
      directoryStructure: {
        onboarding: ONBOARDING_DIR,
        templates: TEMPLATES_DIR,
        checklists: CHECKLISTS_DIR,
        configs: path.join(ONBOARDING_DIR, 'configs'),
      },
      nextSteps: [
        'Review all generated materials',
        'Complete 30-day checklist',
        'Schedule training sessions',
        'Set up dashboard configuration',
        'Enable security settings',
        'Join community forums',
        'Connect with mentor/buddy',
      ],
      supportContacts: {
        itSupport: 'it-support@company.com',
        manager: this.adminInfo.manager,
        ulasisSupport: 'support@ulasis.com',
        emergency: '1-800-ULASIS-911',
      },
      resources: {
        documentation: 'https://docs.ulasis.com',
        training: 'https://training.ulasis.com',
        community: 'https://community.ulasis.com',
        knowledgeBase: 'https://kb.ulasis.com',
      },
    };
    
    const reportPath = path.join(ONBOARDING_DIR, 'onboarding-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also create a readable summary
    const summary = `# Onboarding Completion Report

## Admin Information
- **Name**: ${this.adminInfo.name}
- **Email**: ${this.adminInfo.email}
- **Role**: ${this.adminInfo.role}
- **Department**: ${this.adminInfo.department}
- **Start Date**: ${this.adminInfo.startDate}

## Onboarding Summary
- **Completed**: ${new Date().toLocaleString()}
- **Duration**: ${Math.round((Date.now() - this.startTime) / 1000)} seconds
- **Files Generated**: ${report.generatedFiles.checklists + report.generatedFiles.templates + report.generatedFiles.guides + report.generatedFiles.configs + report.generatedFiles.schedules}

## Generated Materials
### Checklists (${report.generatedFiles.checklists})
- 30-Day Onboarding Checklist
- Security Setup Checklist

### Templates (${report.generatedFiles.templates})
- Welcome Email Template
- User Invitation Template
- Weekly Report Template

### Guides
- Personalized Quick Start Guide

### Configurations (${report.generatedFiles.configs})
- Security Configuration
- Dashboard Configuration

### Schedules
- 4-Week Training Schedule

## Immediate Next Steps
1. **Review Materials**: Go through all generated documents
2. **Security Setup**: Enable 2FA and configure security settings
3. **Dashboard**: Import dashboard configuration
4. **Training**: Start with Week 1 training modules
5. **Checklist**: Begin 30-day onboarding checklist

## Support Contacts
- **Manager**: ${this.adminInfo.manager}
- **IT Support**: it-support@company.com
- **Ulasis Support**: support@ulasis.com
- **Emergency**: 1-800-ULASIS-911

## Online Resources
- **Documentation**: https://docs.ulasis.com
- **Training**: https://training.ulasis.com
- **Community**: https://community.ulasis.com
- **Knowledge Base**: https://kb.ulasis.com

---

**Generated on**: ${new Date().toLocaleDateString()}  
**Location**: ${ONBOARDING_DIR}

Welcome to the team! 🎉`;

    const summaryPath = path.join(ONBOARDING_DIR, 'README.md');
    fs.writeFileSync(summaryPath, summary);
    
    logSuccess('Onboarding report generated');
  }

  displayNextSteps() {
    log('\n📋 Your Onboarding Materials Are Ready!', 'green');
    log('\n📁 Generated Files:', 'blue');
    log(`  📋 Checklists: ${this.checklists.length} files`, 'white');
    log(`  📧 Templates: ${this.templates.length} files`, 'white');
    log(`  📖 Quick Start Guide: 1 file`, 'white');
    log(`  ⚙️  Configurations: 2 files`, 'white');
    log(`  📅 Training Schedule: 1 file`, 'white');
    log(`  📊 Completion Report: 1 file`, 'white');
    
    log('\n🎯 Immediate Actions:', 'magenta');
    log('  1. Review your personalized Quick Start Guide', 'white');
    log('  2. Complete the Security Setup Checklist', 'white');
    log('  3. Import your Dashboard Configuration', 'white');
    log('  4. Start with the 30-Day Onboarding Checklist', 'white');
    log('  5. Schedule your first training session', 'white');
    
    log('\n📞 Need Help?', 'cyan');
    log('  Manager: ' + this.adminInfo.manager, 'white');
    log('  Support: support@ulasis.com', 'white');
    log('  Emergency: 1-800-ULASIS-911', 'white');
    
    log('\n🌐 Online Resources:', 'cyan');
    log('  Documentation: https://docs.ulasis.com', 'white');
    log('  Training: https://training.ulasis.com', 'white');
    log('  Community: https://community.ulasis.com', 'white');
    
    log('\n✨ Congratulations on starting your journey!', 'green');
    log('Your onboarding materials are located in:', 'blue');
    log(ONBOARDING_DIR, 'bright');
  }
}

// Main execution
async function main() {
  // Check dependencies
  try {
    require('@faker-js/faker');
    require('bcrypt');
  } catch (error) {
    log('❌ Missing dependencies. Please install: npm install @faker-js/faker bcrypt', 'red');
    process.exit(1);
  }
  
  // Run onboarding assistant
  const assistant = new AdminOnboardingAssistant();
  await assistant.runOnboarding();
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Enterprise Admin Automated Onboarding', 'bright');
  log('\nUsage: node adminOnboarding.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h              Show this help message', 'blue');
  log('  --output-dir <path>     Output directory for onboarding materials', 'blue');
  log('\nExample:', 'yellow');
  log('  node adminOnboarding.js --output-dir ./my-onboarding', 'blue');
  process.exit(0);
}

if (args.includes('--output-dir')) {
  const index = args.indexOf('--output-dir');
  process.env.ONBOARDING_DIR = args[index + 1];
}

// Run main function
main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});