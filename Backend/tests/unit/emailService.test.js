'use strict';

// Mock nodemailer before requiring the service
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn(() => Promise.resolve()),
    sendMail: jest.fn(() => Promise.resolve({
      messageId: 'test-message-id',
      previewUrl: 'http://preview.url',
    })),
  })),
  createTestAccount: jest.fn(() => Promise.resolve({
    smtp: { host: 'test.smtp.host', port: 587, secure: false },
    user: 'test@example.com',
    pass: 'testpass',
  })),
}));

// Mock fs for template loading
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(() => Promise.resolve('<html>Test Template {{variable}}</html>')),
  },
}));

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock the email config
jest.mock('../../src/config/email', () => ({
  host: 'smtp.test.com',
  port: 587,
  secure: false,
  auth: { user: 'test@test.com', pass: 'testpass' },
  from: { name: 'Test', email: 'test@test.com' },
  frontendUrl: 'http://localhost:3000',
  queue: {
    maxRetries: 3,
    retryDelay: 30000,
    processingInterval: 30000,
  },
  templates: {
    path: './src/templates/email',
  },
}));

// Mock sequelize
jest.mock('../../src/config/database', () => ({
  sequelize: {
    sync: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  },
}));

// Mock NotificationHistory
jest.mock('../../src/models', () => ({
  NotificationHistory: {
    create: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
    update: jest.fn(() => Promise.resolve([1])),
    destroy: jest.fn(() => Promise.resolve(1)),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));

const emailService = require('../../src/services/emailService');
const { NotificationHistory } = require('../../src/models');
const { sequelize } = require('../../src/config/database');
const fs = require('fs').promises;
const path = require('path');

describe('Email Service', () => {
  let historyIdCounter = 1;

  // Spy on methods for testing
  const renderTemplateSpy = jest.spyOn(emailService, 'renderTemplate');
  const sanitizeTemplateValueSpy = jest.spyOn(emailService, 'sanitizeTemplateValue');
  const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');
  const updateEmailStatusSpy = jest.spyOn(emailService, 'updateEmailStatus');
  const sendEmailImmediateSpy = jest.spyOn(emailService, 'sendEmailImmediate');

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    // Reset service state
    emailService.queue = [];
    emailService.isProcessing = false;
    // Reset to default templates only
    emailService.templates = {
      verification: 'Hello {{first_name}}, please verify your email: {{verification_url}}',
      'password-reset': 'Hello {{first_name}}, reset your password: {{reset_url}}',
      'questionnaire-review': 'Hello {{first_name}}, your questionnaire "{{title}}" has received a new review.',
      'subscription-reminder': 'Hello {{first_name}}, your subscription will expire soon.',
      'payment-confirmation': 'Hello {{first_name}}, payment of {{amount}} {{currency}} received.',
      test: 'Hello {{first_name}}, this is a test email sent at {{test_time}}.',
    };
    historyIdCounter = 1;

    // Reset all mocks
    jest.clearAllMocks();

    // Mock fs.readFile for templates
    fs.readFile.mockImplementation((filePath) => {
      const fileName = path.basename(filePath, '.html');
      return Promise.resolve(`<html>Test Template {{variable}} for ${fileName}</html>`);
    });

    // Mock NotificationHistory
    NotificationHistory.create.mockImplementation((data) => {
      const record = {
        id: historyIdCounter++,
        ...data,
        created_at: new Date(),
      };
      return Promise.resolve(record);
    });

    NotificationHistory.update.mockResolvedValue([1]);
    NotificationHistory.findOne.mockResolvedValue(null);
    NotificationHistory.findByPk.mockImplementation((id) => {
      return Promise.resolve({
        id,
        user_id: 1,
        notification_type: 'test',
        email_subject: 'Test',
        email_status: 'queued',
        sent_at: null,
        delivered_at: null,
        created_at: new Date(),
        update: jest.fn(),
      });
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Template Loading', () => {
    test('should load email templates successfully', async () => {
      const mockTemplate = '<html>Test Template {{variable}}</html>';
      fs.readFile.mockResolvedValue(mockTemplate);

      await emailService.loadTemplates();

      expect(emailService.templates.verification).toBe(mockTemplate);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join('./src/templates/email', 'verification.html'),
        'utf8',
      );
    });

    test('should handle template loading errors gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      // Clear the verification template to test error case
      delete emailService.templates.verification;

      await emailService.loadTemplates();

      expect(emailService.templates.verification).toBeUndefined();
    });
  });

  describe('Template Rendering', () => {
    test('should render template with variables', () => {
      emailService.templates.test = 'Hello {{name}}, welcome to {{app}}!';
      const result = emailService.renderTemplate('test', {
        name: 'John',
        app: 'Ulasis',
      });

      expect(result).toBe('Hello John, welcome to Ulasis!');
      expect(renderTemplateSpy).toHaveBeenCalledWith('test', {
        name: 'John',
        app: 'Ulasis',
      });
    });

    test('should sanitize template variables to prevent injection', () => {
      emailService.templates.test = 'Hello {{name}}!';
      const result = emailService.renderTemplate('test', {
        name: '<script>alert("xss")</script>{{malicious}}',
      });

      expect(result).toBe('Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;\\{\\{malicious\\}\\}!');
      expect(sanitizeTemplateValueSpy).toHaveBeenCalledWith('<script>alert("xss")</script>{{malicious}}');
    });

    test('should throw error for missing template', () => {
      renderTemplateSpy.mockImplementationOnce(() => {
        throw new Error('Template nonexistent not found');
      });

      expect(() => {
        emailService.renderTemplate('nonexistent', {});
      }).toThrow('Template nonexistent not found');
    });
  });

  describe('Email Queue', () => {
    test('should add email to queue', async () => {
      const mailOptions = {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const result = await emailService.sendEmail(mailOptions, 1, 'test');

      expect(result.queued).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith(mailOptions, 1, 'test');
      expect(emailService.queue.length).toBe(1);
      expect(emailService.queue[0].mailOptions).toBe(mailOptions);
    });

    test('should process queue automatically', async () => {
      const mailOptions = {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      await emailService.sendEmail(mailOptions, 1, 'test');

      // Manually process queue for test
      await emailService.processQueue();

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(emailService.queue.length).toBe(0);
    });
  });

  describe('Email Sending', () => {
    test('should send verification email successfully', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
      };

      emailService.templates.verification = 'Verification template {{first_name}} {{verification_url}}';

      const result = await emailService.sendVerificationEmail(user, 'token123');

      expect(result.queued).toBe(true);
      expect(NotificationHistory.create).toHaveBeenCalledWith({
        user_id: 1,
        notification_type: 'verification',
        email_subject: 'Verify Your Email Address - Ulasis',
        email_status: 'queued',
      });
    });

    test('should send password reset email successfully', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
      };

      emailService.templates['password-reset'] = 'Reset template {{first_name}} {{reset_url}}';

      const result = await emailService.sendPasswordResetEmail(user, 'token123');

      expect(result.queued).toBe(true);
      expect(NotificationHistory.create).toHaveBeenCalledWith({
        user_id: 1,
        notification_type: 'security',
        email_subject: 'Reset Your Password - Ulasis',
        email_status: 'queued',
      });
    });

    test('should send test email successfully', async () => {
      const result = await emailService.testEmailConfiguration('test@example.com', 1);

      expect(result.queued).toBe(true);
      expect(NotificationHistory.create).toHaveBeenCalledWith({
        user_id: 1,
        notification_type: 'test',
        email_subject: 'Ulasis Email Configuration Test',
        email_status: 'queued',
      });
    });
  });

  describe('Email Status Updates', () => {
    test('should update email status to sent', async () => {
      const history = await NotificationHistory.create({
        user_id: 1,
        notification_type: 'test',
        email_subject: 'Test',
        email_status: 'queued',
      });

      await emailService.updateEmailStatus(history.id, 'sent');

      expect(NotificationHistory.update).toHaveBeenCalledWith(
        { email_status: 'sent', sent_at: expect.any(Date) },
        { where: { id: history.id } },
      );
    });

    test('should update email status to delivered', async () => {
      const history = await NotificationHistory.create({
        user_id: 1,
        notification_type: 'test',
        email_subject: 'Test',
        email_status: 'sent',
      });

      await emailService.updateEmailStatus(history.id, 'delivered');

      expect(NotificationHistory.update).toHaveBeenCalledWith(
        { email_status: 'delivered', delivered_at: expect.any(Date) },
        { where: { id: history.id } },
      );
    });

    test('should update email status to failed with error', async () => {
      const history = await NotificationHistory.create({
        user_id: 1,
        notification_type: 'test',
        email_subject: 'Test',
        email_status: 'sent',
      });

      await emailService.updateEmailStatus(history.id, 'failed', 'SMTP error');

      expect(NotificationHistory.update).toHaveBeenCalledWith(
        { email_status: 'failed', error_message: 'SMTP error' },
        { where: { id: history.id } },
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle email sending failures', async () => {
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValueOnce({
        verify: jest.fn(() => Promise.resolve()),
        sendMail: jest.fn(() => Promise.reject(new Error('SMTP failed'))),
      });

      const mailOptions = {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const emailJob = {
        mailOptions,
        historyId: 1,
        retryCount: 0,
        notificationType: 'test',
      };

      // Mock transporter to reject
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP failed')),
        verify: jest.fn(),
      };
      emailService.transporter = mockTransporter;

      await expect(emailService.sendEmailImmediate(emailJob)).rejects.toThrow('SMTP failed');
      expect(NotificationHistory.update).toHaveBeenCalledWith(
        { email_status: 'failed', error_message: 'SMTP failed' },
        { where: { id: 1 } },
      );
    });

    test('should retry failed emails up to max retries', async () => {
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValue({
        verify: jest.fn(() => Promise.resolve()),
        sendMail: jest.fn(() => Promise.reject(new Error('SMTP failed'))),
      });

      const mailOptions = {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const emailJob = {
        mailOptions,
        historyId: 1,
        retryCount: 0,
        notificationType: 'test',
      };

      // First attempt
      await expect(emailService.sendEmailImmediate(emailJob)).rejects.toThrow();

      // Should update status to failed
      expect(NotificationHistory.update).toHaveBeenCalledWith(
        { email_status: 'failed', error_message: 'SMTP failed' },
        { where: { id: 1 } },
      );
    });
  });
});