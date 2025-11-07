'use strict';

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const { NotificationHistory } = require('../models');
const emailConfig = require('../config/email');

/**
 * Email service for sending transactional emails with queue and tracking
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.queue = [];
    this.isProcessing = false;
    this.templates = {};

    this.initializeTransporter();
    this.loadTemplates();
    if (process.env.NODE_ENV !== 'test') {
      this.startQueueProcessor();
    }
  }

  /**
   * Initialize nodemailer transporter based on configuration
   */
  async initializeTransporter() {
    // For development and test, use ethereal.email or test account
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      if (process.env.NODE_ENV === 'test') {
        // Skip transporter initialization in tests
        this.transporter = null;
        return;
      }
      logger.info('Using test email account for development');
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
          tls: {
            rejectUnauthorized: false, // Allow self-signed certificates in development
          },
        });
        logger.info('Test email account created:', testAccount.user);
      } catch (error) {
        logger.error('Failed to create test email account:', error);
      }
    } else {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
      });
    }

    // Verify connection configuration
    if (this.transporter && typeof this.transporter.then !== 'function') {
      this.transporter.verify()
        .then(() => {
          logger.info('Email service is ready to send messages');
        })
        .catch((error) => {
          logger.error('Email service configuration error:', error);
        });
    } else {
      // For promise transporter, verify after resolve
      this.transporter.then((transporter) => {
        transporter.verify()
          .then(() => {
            logger.info('Email service is ready to send messages');
          })
          .catch((error) => {
            logger.error('Email service configuration error:', error);
          });
      });
    }
  }

  /**
   * Load email templates from files
   */
  async loadTemplates() {
    const templateDir = emailConfig.templates.path;
    const templateFiles = [
      'verification.html',
      'password-reset.html',
      'new-review.html',
      'subscription-change.html',
      'subscription-request.html',
      'subscription-approved.html',
      'subscription-rejected.html',
    ];

    for (const file of templateFiles) {
      try {
        const filePath = path.join(templateDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        this.templates[file.replace('.html', '')] = content;
        logger.info(`Loaded email template: ${file}`);
      } catch (error) {
        logger.error(`Failed to load email template ${file}:`, error);
      }
    }
  }

  /**
   * Load a single template by name
   * @param {string} templateName - Name of the template (without .html extension)
   * @returns {Promise<string>} Template content
   */
  async loadTemplate(templateName) {
    // First check if template is already loaded
    if (this.templates[templateName]) {
      return this.templates[templateName];
    }

    // If not loaded, try to load it now
    try {
      const templateDir = emailConfig.templates.path;
      const filePath = path.join(templateDir, `${templateName}.html`);
      const content = await fs.readFile(filePath, 'utf8');
      this.templates[templateName] = content;
      logger.info(`Loaded email template on demand: ${templateName}.html`);
      return content;
    } catch (error) {
      logger.error(`Failed to load email template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Start the email queue processor
   */
  startQueueProcessor() {
    setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processQueue();
      }
    }, emailConfig.queue.processingInterval);
  }

  /**
   * Process emails in the queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const emailJob = this.queue.shift();
      try {
        await this.sendEmailImmediate(emailJob);
      } catch (error) {
        logger.error('Failed to process queued email:', error);
        // Re-queue with retry count
        if (emailJob.retryCount < emailConfig.queue.maxRetries) {
          emailJob.retryCount++;
          setTimeout(() => {
            this.queue.push(emailJob);
          }, emailConfig.queue.retryDelay);
        } else {
          // Mark as failed in database
          await this.updateEmailStatus(emailJob.historyId, 'failed', error.message);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Sanitize template variable to prevent injection attacks
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  sanitizeTemplateValue(value) {
    if (typeof value !== 'string') {
      return String(value);
    }

    // Escape template syntax to prevent injection
    return value
      .replace(/{{/g, '\\{\\{')
      .replace(/\}\}/g, '\\}\\}')
      // Also escape HTML entities for security
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Render email template with data
   * @param {string} templateName - Name of the template
   * @param {Object} data - Template variables
   * @returns {string} Rendered HTML
   */
  renderTemplate(templateName, data) {
    let template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Simple template rendering with {{variable}} syntax
    for (const [key, value] of Object.entries(data)) {
      const sanitizedValue = this.sanitizeTemplateValue(value);
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, sanitizedValue);
    }

    return template;
  }

  /**
   * Update email status in database
   * @param {number} historyId - Notification history ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message if failed
   */
  async updateEmailStatus(historyId, status, errorMessage = null) {
    try {
      const updateData = {
        email_status: status,
      };

      if (status === 'sent') {
        updateData.sent_at = new Date();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date();
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      await NotificationHistory.update(updateData, {
        where: { id: historyId },
      });
    } catch (error) {
      logger.error('Failed to update email status:', error);
    }
  }

  /**
   * Send email verification email
   * @param {Object} user - User object
   * @param {string} verificationToken - Email verification token
   * @returns {Promise} Email sending result
   */
  // eslint-disable-next-line require-await
  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${emailConfig.frontendUrl}/verify-email?token=${verificationToken}`;

    const templateData = {
      first_name: user.first_name || 'there',
      verification_url: verificationUrl,
    };

    const htmlContent = this.renderTemplate('verification', templateData);
    const textContent = `
Welcome to Ulasis!

Hi ${templateData.first_name},

Thank you for registering with Ulasis. To complete your registration, please verify your email address by visiting this link:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with Ulasis, you can safely ignore this email.

© 2025 Ulasis. All rights reserved.
    `;

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: 'Verify Your Email Address - Ulasis',
      html: htmlContent,
      text: textContent,
    };

    return this.sendEmail(mailOptions, user.id, 'verification');
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise} Email sending result
   */
  // eslint-disable-next-line require-await
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${emailConfig.frontendUrl}/reset-password?token=${resetToken}`;

    const templateData = {
      first_name: user.first_name || 'there',
      reset_url: resetUrl,
    };

    const htmlContent = this.renderTemplate('password-reset', templateData);
    const textContent = `
Password Reset Request - Ulasis

Hi ${templateData.first_name},

We received a request to reset your password for your Ulasis account. Visit this link to reset your password:

${resetUrl}

Important:
- This password reset link will expire in 1 hour
- If you didn't request this password reset, please ignore this email
- Your password will remain unchanged if you don't visit the link

For security reasons, please make sure your new password is:
- At least 8 characters long
- Contains both letters and numbers
- Not similar to your previous passwords

© 2025 Ulasis. All rights reserved.
    `;

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: 'Reset Your Password - Ulasis',
      html: htmlContent,
      text: textContent,
    };

    return this.sendEmail(mailOptions, user.id, 'security');
  }

  /**
   * Send welcome email after successful verification
   * @param {Object} user - User object
   * @returns {Promise} Email sending result
   */
  // eslint-disable-next-line require-await
  async sendWelcomeEmail(user) {
    const loginUrl = `${emailConfig.frontendUrl}/login`;

    const templateData = {
      first_name: user.first_name || 'there',
      login_url: loginUrl,
      subscription_plan: user.subscription_plan || 'Free',
    };

    // For welcome email, we'll use a simple inline template since it's not in the templates
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ulasis!</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #10b981; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Ulasis! 🎉</h1>
  </div>
  <div class="content">
    <h2>Your Account is Ready!</h2>
    <p>Congratulations ${templateData.first_name}! Your email has been successfully verified and your Ulasis account is now active.</p>

    <h3>What can you do with Ulasis?</h3>
    <div class="feature">
      <strong>📋 Create Questionnaires</strong><br>
      Design custom forms and surveys for your needs
    </div>
    <div class="feature">
      <strong>📊 Analyze Responses</strong><br>
      Get detailed insights and analytics from your data
    </div>
    <div class="feature">
      <strong>🔗 Share & Collaborate</strong><br>
      Work with your team and share results easily
    </div>

    <p style="text-align: center;">
      <a href="${templateData.login_url}" class="button">Login to Get Started</a>
    </p>

    <p>Your current subscription plan: <strong>${templateData.subscription_plan}</strong></p>
    <p>You can upgrade your plan anytime to access more features and higher limits.</p>
  </div>
  <div class="footer">
    <p>&copy; 2025 Ulasis. All rights reserved.</p>
    <p>Need help? Contact us at support@ulasis.com</p>
  </div>
</body>
</html>
    `;

    const textContent = `
Welcome to Ulasis! 🎉

Congratulations ${templateData.first_name}! Your email has been successfully verified and your Ulasis account is now active.

What can you do with Ulasis?
📋 Create Questionnaires - Design custom forms and surveys for your needs
📊 Analyze Responses - Get detailed insights and analytics from your data
🔗 Share & Collaborate - Work with your team and share results easily

Login to get started: ${templateData.login_url}

Your current subscription plan: ${templateData.subscription_plan}
You can upgrade your plan anytime to access more features and higher limits.

© 2025 Ulasis. All rights reserved.
Need help? Contact us at support@ulasis.com
    `;

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: 'Welcome to Ulasis! Your Account is Ready',
      html: htmlContent,
      text: textContent,
    };

    return this.sendEmail(mailOptions, user.id, 'verification');
  }

  /**
   * Send email with queue and tracking
   * @param {Object} mailOptions - Nodemailer mail options
   * @param {number} userId - User ID for tracking
   * @param {string} notificationType - Type of notification
   * @returns {Promise} Email sending result
   */
  async sendEmail(mailOptions, userId, notificationType) {
    // Create notification history record
    const historyRecord = await NotificationHistory.create({
      user_id: userId,
      notification_type: notificationType,
      email_subject: mailOptions.subject,
      email_status: 'queued',
    });

    // Add to queue
    const emailJob = {
      mailOptions,
      historyId: historyRecord.id,
      retryCount: 0,
      notificationType,
    };

    this.queue.push(emailJob);

    return { queued: true, historyId: historyRecord.id };
  }

  /**
   * Send email immediately (used by queue processor)
   * @param {Object} emailJob - Email job object
   * @returns {Promise} Email sending result
   */
  async sendEmailImmediate(emailJob) {
    const { mailOptions, historyId, notificationType } = emailJob;

    try {
      // Wait for transporter to be ready if it's a promise
      let transporter = this.transporter;
      if (transporter && typeof transporter.then === 'function') {
        transporter = await transporter;
      }

      // Update status to sent
      await this.updateEmailStatus(historyId, 'sent');

      const result = await transporter.sendMail(mailOptions);

      // Update status to delivered
      await this.updateEmailStatus(historyId, 'delivered');

      logger.info(`${notificationType} email sent successfully`, {
        to: mailOptions.to,
        messageId: result.messageId,
        historyId,
        notificationType,
      });

      // In development, log the preview URL if available
      if (process.env.NODE_ENV === 'development' && result.previewUrl) {
        logger.info(`Email preview URL: ${result.previewUrl}`);
      }

      return result;
    } catch (error) {
      logger.error(`Failed to send ${notificationType} email`, {
        to: mailOptions.to,
        error: error.message,
        historyId,
        notificationType,
      });

      // Update status to failed
      await this.updateEmailStatus(historyId, 'failed', error.message);

      throw error;
    }
  }

  /**
   * Send new review notification email
   * @param {Object} user - User object
   * @param {Object} reviewData - Review data
   * @returns {Promise} Email sending result
   */
  // eslint-disable-next-line require-await
  async sendNewReviewEmail(user, reviewData) {
    const questionnaireUrl = `${emailConfig.frontendUrl}/questionnaires/${reviewData.questionnaireId}`;

    const templateData = {
      first_name: user.first_name || 'there',
      questionnaire_title: reviewData.questionnaireTitle,
      rating: '⭐'.repeat(reviewData.rating),
      reviewer_name: reviewData.reviewerName,
      submitted_at: new Date(reviewData.submittedAt).toLocaleDateString(),
      questionnaire_url: questionnaireUrl,
      review_text: reviewData.reviewText || '',
    };

    const htmlContent = this.renderTemplate('new-review', templateData);
    const textContent = `
New Review Notification - Ulasis

Hi ${templateData.first_name},

You have received a new review for your questionnaire "${templateData.questionnaire_title}".

Review Details:
Rating: ${templateData.rating}
Reviewer: ${templateData.reviewer_name}
Submitted: ${templateData.submitted_at}
${templateData.review_text ? `Review: ${templateData.review_text}` : ''}

View the full review: ${templateData.questionnaire_url}

© 2025 Ulasis. All rights reserved.
    `;

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: `New Review for "${reviewData.questionnaireTitle}" - Ulasis`,
      html: htmlContent,
      text: textContent,
    };

    return this.sendEmail(mailOptions, user.id, 'review');
  }

  /**
   * Send subscription change notification email
   * @param {Object} user - User object
   * @param {Object} subscriptionData - Subscription change data
   * @returns {Promise} Email sending result
   */
  // eslint-disable-next-line require-await
  async sendSubscriptionChangeEmail(user, subscriptionData) {
    const accountUrl = `${emailConfig.frontendUrl}/account`;

    const templateData = {
      first_name: user.first_name || 'there',
      old_plan: subscriptionData.oldPlan,
      new_plan: subscriptionData.newPlan,
      effective_date: new Date(subscriptionData.effectiveDate).toLocaleDateString(),
      account_url: accountUrl,
      upgrade: subscriptionData.upgrade || false,
      downgrade: subscriptionData.downgrade || false,
    };

    if (subscriptionData.billingAmount) {
      templateData.billing_amount = subscriptionData.billingAmount;
    }

    const htmlContent = this.renderTemplate('subscription-change', templateData);
    const textContent = `
Subscription Update - Ulasis

Hi ${templateData.first_name},

Your Ulasis subscription has been updated.

Previous Plan: ${templateData.old_plan}
New Plan: ${templateData.new_plan}
Effective Date: ${templateData.effective_date}
${templateData.billing_amount ? `Next Billing Amount: $${templateData.billing_amount}` : ''}

${templateData.upgrade ? 'Congratulations on your upgrade!' : ''}
${templateData.downgrade ? 'Your account will be downgraded at the end of your current billing cycle.' : ''}

Manage your subscription: ${templateData.account_url}

© 2025 Ulasis. All rights reserved.
    `;

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: 'Your Ulasis Subscription Has Been Updated',
      html: htmlContent,
      text: textContent,
    };

    return this.sendEmail(mailOptions, user.id, 'subscription');
  }

  /**
   * Send subscription request notification to admin
   * @param {Object} admin - Admin user object
   * @param {Object} requestData - Request data
   * @returns {Promise} Email sending result
   */
  async sendSubscriptionRequestEmail(admin, requestData) {
    const htmlContent = this.renderTemplate('subscription-request', requestData);

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: admin.email,
      subject: `🔄 Subscription Change Request - ${requestData.user_name}`,
      html: htmlContent,
      text: `Subscription change request received from ${requestData.user_name} (${requestData.user_email}). Requested change: ${requestData.current_plan} → ${requestData.requested_plan}. Reason: ${requestData.reason || 'Not provided'}.`,
    };

    return this.sendEmail(mailOptions, admin.id || 0, 'subscription_request');
  }

  /**
   * Send subscription approval email to user
   * @param {Object} user - User object
   * @param {Object} approvalData - Approval data
   * @returns {Promise} Email sending result
   */
  async sendSubscriptionApprovedEmail(user, approvalData) {
    const htmlContent = this.renderTemplate('subscription-approved', {
      ...approvalData,
      dashboard_url: process.env.FRONTEND_URL || 'http://localhost:3000',
    });

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: '✅ Your Subscription Request Has Been Approved!',
      html: htmlContent,
      text: `Your subscription request has been approved! Your plan has been changed from ${approvalData.old_plan} to ${approvalData.new_plan}.`,
    };

    return this.sendEmail(mailOptions, user.id, 'subscription_approved');
  }

  /**
   * Send subscription rejection email to user
   * @param {Object} user - User object
   * @param {Object} rejectionData - Rejection data
   * @returns {Promise} Email sending result
   */
  async sendSubscriptionRejectedEmail(user, rejectionData) {
    const htmlContent = this.renderTemplate('subscription-rejected', {
      ...rejectionData,
      dashboard_url: process.env.FRONTEND_URL || 'http://localhost:3000',
    });

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: user.email,
      subject: '❌ Your Subscription Request Was Not Approved',
      html: htmlContent,
      text: `Your subscription request to change from ${rejectionData.current_plan} to ${rejectionData.requested_plan} was not approved. Reason: ${rejectionData.rejection_reason}`,
    };

    return this.sendEmail(mailOptions, user.id, 'subscription_rejected');
  }

  /**
   * Test email configuration
   * @param {string} testEmail - Email address to send test to
   * @param {number} userId - User ID for tracking
   * @returns {Promise} Test email result
   */
  // eslint-disable-next-line require-await
  async testEmailConfiguration(testEmail, userId) {
    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: testEmail,
      subject: 'Ulasis Email Configuration Test',
      html: '<p>This is a test email to verify the email configuration is working correctly.</p><p>If you received this email, your email settings are configured properly.</p>',
      text: 'This is a test email to verify the email configuration is working correctly. If you received this email, your email settings are configured properly.',
    };

    return this.sendEmail(mailOptions, userId, 'test');
  }
}

module.exports = new EmailService();
