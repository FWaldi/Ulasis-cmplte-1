const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Security Event Monitoring System
 *
 * This module provides comprehensive security monitoring including:
 * - Intrusion detection
 * - Anomaly detection
 * - Threat intelligence
 * - Security incident logging
 * - Automated response actions
 */

class SecurityMonitor {
  constructor() {
    this.events = [];
    this.alerts = [];
    this.blockedIPs = new Map();
    this.suspiciousPatterns = new Map();
    this.intervals = []; // Track interval IDs for cleanup
    this.threatLevels = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    this.detectionRules = {
      // Brute force detection
      bruteForce: {
        threshold: 5, // failed attempts
        window: 300000, // 5 minutes
        action: 'block_ip',
      },

      // Rate limit abuse
      rateLimitAbuse: {
        threshold: 20, // rate limit hits
        window: 60000, // 1 minute
        action: 'monitor',
      },

      // Suspicious user agents
      suspiciousUserAgent: {
        patterns: [/bot/i, /crawler/i, /scanner/i, /sqlmap/i, /nikto/i, /nmap/i],
        action: 'monitor',
      },

      // SQL injection patterns
      sqlInjection: {
        patterns: [
          /union\s+select/i,
          /or\s+1\s*=\s*1/i,
          /or\s+'1'\s*=\s*'1/i,
          /drop\s+table/i,
          /insert\s+into/i,
          /delete\s+from/i,
          /update\s+.*\s+set/i,
          /'\s*or\s*'1'\s*=\s*'1/i,
          /"\s*or\s*"1"\s*=\s*"1/i,
          /\bor\s+1\s*=\s*1\b/i,
          /'\s*;\s*drop/i,
          /"\s*;\s*drop/i,
        ],
        action: 'block_request',
      },

      // XSS patterns
      xss: {
        patterns: [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i, /<embed/i],
        action: 'block_request',
      },

      // Path traversal
      pathTraversal: {
        patterns: [/\.\.\//, /%2e%2e%2f/i, /%2e%2e\\/i, /\.\.\\/],
        action: 'block_request',
      },
    };

    if (process.env.NODE_ENV !== 'test') {
      this.startPeriodicAnalysis();
    }
  }

  /**
   * Start periodic security analysis
   */
  startPeriodicAnalysis() {
    // Analyze security events every 2 minutes
    const analysisInterval = setInterval(() => {
      this.analyzeSecurityEvents();
    }, 120000);
    this.intervals.push(analysisInterval);

    // Clean old events every hour
    const cleanupInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 3600000);
    this.intervals.push(cleanupInterval);

    // Generate security report every 6 hours
    const reportInterval = setInterval(() => {
      this.generateSecurityReport();
    }, 21600000);
    this.intervals.push(reportInterval);
  }

  /**
   * Cleanup all intervals (for test teardown)
   */
  cleanup() {
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    this.intervals = [];
  }

  /**
   * Record security event
   */
  recordEvent(eventType, details, severity = 'MEDIUM') {
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: eventType,
      severity,
      details: this.sanitizeDetails(details),
      resolved: false,
    };

    this.events.push(event);

    // Check for immediate threats
    this.checkImmediateThreats(event);

    logger.warn('Security event recorded', {
      eventId: event.id,
      type: eventType,
      severity,
      details: event.details,
    });

    return event.id;
  }

  /**
   * Analyze HTTP request for security threats
   */
  analyzeRequest(req, _res) {
    const analysis = {
      threats: [],
      riskScore: 0,
      actions: [],
    };

    const details = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers,
    };

    // Check for suspicious user agents
    const userAgentThreat = this.checkSuspiciousUserAgent(details.userAgent);
    if (userAgentThreat) {
      analysis.threats.push(userAgentThreat);
      analysis.riskScore += 2;
    }

    // Check for SQL injection
    const sqlThreat = this.checkSQLInjection(details);
    if (sqlThreat) {
      analysis.threats.push(sqlThreat);
      analysis.riskScore += 5;
      analysis.actions.push('block_request');
    }

    // Check for XSS
    const xssThreat = this.checkXSS(details);
    if (xssThreat) {
      analysis.threats.push(xssThreat);
      analysis.riskScore += 4;
      analysis.actions.push('block_request');
    }

    // Check for path traversal
    const pathTraversalThreat = this.checkPathTraversal(details);
    if (pathTraversalThreat) {
      analysis.threats.push(pathTraversalThreat);
      analysis.riskScore += 3;
      analysis.actions.push('block_request');
    }

    // Record event if threats detected
    if (analysis.threats.length > 0) {
      const severity = this.calculateSeverity(analysis.riskScore);
      this.recordEvent(
        'security_threat_detected',
        {
          ...details,
          threats: analysis.threats,
          riskScore: analysis.riskScore,
        },
        severity,
      );
    }

    return analysis;
  }

  /**
   * Check for suspicious user agents
   */
  checkSuspiciousUserAgent(userAgent) {
    if (!userAgent) return null;

    for (const pattern of this.detectionRules.suspiciousUserAgent.patterns) {
      if (pattern.test(userAgent)) {
        return {
          type: 'suspicious_user_agent',
          pattern: pattern.source,
          userAgent: userAgent.substring(0, 100),
        };
      }
    }

    return null;
  }

  /**
   * Check for SQL injection patterns
   */
  checkSQLInjection(details) {
    const targets = [
      details.path,
      JSON.stringify(details.query),
      JSON.stringify(details.body),
    ].join(' ');

    for (const pattern of this.detectionRules.sqlInjection.patterns) {
      if (pattern.test(targets)) {
        return {
          type: 'sql_injection_attempt',
          pattern: pattern.source,
          location: this.detectThreatLocation(details, pattern),
        };
      }
    }

    return null;
  }

  /**
   * Check for XSS patterns
   */
  checkXSS(details) {
    const targets = [
      details.path,
      JSON.stringify(details.query),
      JSON.stringify(details.body),
    ].join(' ');

    for (const pattern of this.detectionRules.xss.patterns) {
      if (pattern.test(targets)) {
        return {
          type: 'xss_attempt',
          pattern: pattern.source,
          location: this.detectThreatLocation(details, pattern),
        };
      }
    }

    return null;
  }

  /**
   * Check for path traversal patterns
   */
  checkPathTraversal(details) {
    const targets = [details.path, JSON.stringify(details.query)].join(' ');

    for (const pattern of this.detectionRules.pathTraversal.patterns) {
      if (pattern.test(targets)) {
        return {
          type: 'path_traversal_attempt',
          pattern: pattern.source,
          location: this.detectThreatLocation(details, pattern),
        };
      }
    }

    return null;
  }

  /**
   * Detect where the threat was found
   */
  detectThreatLocation(details, pattern) {
    const locations = [];

    if (pattern.test(details.path)) {
      locations.push('path');
    }

    if (pattern.test(JSON.stringify(details.query))) {
      locations.push('query');
    }

    if (pattern.test(JSON.stringify(details.body))) {
      locations.push('body');
    }

    return locations.join(', ');
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(ip, email, reason) {
    const key = `auth_failure_${ip}`;

    if (!this.suspiciousPatterns.has(key)) {
      this.suspiciousPatterns.set(key, {
        count: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }

    const pattern = this.suspiciousPatterns.get(key);
    pattern.count++;
    pattern.lastSeen = Date.now();

    // Check for brute force
    if (pattern.count >= this.detectionRules.bruteForce.threshold) {
      const timeWindow = Date.now() - pattern.firstSeen;
      if (timeWindow <= this.detectionRules.bruteForce.window) {
        this.recordEvent(
          'brute_force_detected',
          {
            ip,
            email,
            attempts: pattern.count,
            timeWindow: timeWindow / 1000,
            reason,
          },
          'HIGH',
        );

        this.blockIP(ip, this.detectionRules.bruteForce.window * 2);
      }
    }

    this.recordEvent(
      'authentication_failure',
      {
        ip,
        email,
        reason,
        attemptCount: pattern.count,
      },
      'LOW',
    );
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(ip, endpoint) {
    const key = `rate_limit_${ip}_${endpoint}`;

    if (!this.suspiciousPatterns.has(key)) {
      this.suspiciousPatterns.set(key, {
        count: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }

    const pattern = this.suspiciousPatterns.get(key);
    pattern.count++;
    pattern.lastSeen = Date.now();

    // Check for rate limit abuse
    if (pattern.count >= this.detectionRules.rateLimitAbuse.threshold) {
      const timeWindow = Date.now() - pattern.firstSeen;
      if (timeWindow <= this.detectionRules.rateLimitAbuse.window) {
        this.recordEvent(
          'rate_limit_abuse',
          {
            ip,
            endpoint,
            hits: pattern.count,
            timeWindow: timeWindow / 1000,
          },
          'MEDIUM',
        );
      }
    }
  }

  /**
   * Block IP address
   */
  blockIP(ip, duration = 3600000) {
    // Default 1 hour
    const blockedUntil = Date.now() + duration;

    this.blockedIPs.set(ip, {
      blockedAt: Date.now(),
      blockedUntil,
      reason: 'security_violation',
    });

    this.recordEvent(
      'ip_blocked',
      {
        ip,
        duration: duration / 1000,
        blockedUntil: new Date(blockedUntil).toISOString(),
      },
      'HIGH',
    );

    logger.warn('IP address blocked', { ip, duration: duration / 1000 });
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip) {
    const blockInfo = this.blockedIPs.get(ip);
    if (!blockInfo) return false;

    if (Date.now() > blockInfo.blockedUntil) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Analyze security events for patterns
   */
  analyzeSecurityEvents() {
    const now = Date.now();
    const recentEvents = this.events.filter(
      (event) => now - new Date(event.timestamp).getTime() < 3600000, // Last hour
    );

    // Analyze event patterns
    this.analyzeEventPatterns(recentEvents);

    // Check for emerging threats
    this.checkEmergingThreats(recentEvents);
  }

  /**
   * Analyze event patterns
   */
  analyzeEventPatterns(events) {
    const eventCounts = {};
    const ipCounts = {};

    events.forEach((event) => {
      // Count by event type
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;

      // Count by IP
      const ip = event.details.ip;
      if (ip) {
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      }
    });

    // Check for high-frequency events
    Object.entries(eventCounts).forEach(([type, count]) => {
      if (count > 10) {
        // More than 10 events of same type in hour
        this.recordEvent(
          'high_frequency_event_pattern',
          {
            eventType: type,
            count,
            timeWindow: '1 hour',
          },
          'MEDIUM',
        );
      }
    });

    // Check for suspicious IPs
    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count > 20) {
        // More than 20 events from same IP in hour
        this.recordEvent(
          'suspicious_ip_activity',
          {
            ip,
            eventCount: count,
            timeWindow: '1 hour',
          },
          'HIGH',
        );
      }
    });
  }

  /**
   * Check for emerging threats
   */
  checkEmergingThreats(events) {
    // Group events by type and look for spikes
    const recentThreats = events.filter(
      (event) => event.type.includes('threat') || event.type.includes('attack'),
    );

    if (recentThreats.length > 5) {
      this.recordEvent(
        'emerging_threat_detected',
        {
          threatCount: recentThreats.length,
          timeWindow: '1 hour',
          threatTypes: [...new Set(recentThreats.map((e) => e.type))],
        },
        'HIGH',
      );
    }
  }

  /**
   * Check for immediate threats
   */
  checkImmediateThreats(event) {
    if (event.severity === 'CRITICAL') {
      this.createAlert(event, 'immediate_action_required');
    }
  }

  /**
   * Create security alert
   */
  createAlert(event, alertType) {
    const alert = {
      id: crypto.randomUUID(),
      eventId: event.id,
      type: alertType,
      timestamp: new Date().toISOString(),
      severity: event.severity,
      acknowledged: false,
    };

    this.alerts.push(alert);

    logger.error('Security alert created', {
      alertId: alert.id,
      eventId: event.id,
      type: alertType,
      severity: event.severity,
    });
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    const now = Date.now();
    const last24Hours = this.events.filter(
      (event) => now - new Date(event.timestamp).getTime() < 86400000,
    );

    const report = {
      timestamp: new Date().toISOString(),
      period: '24 hours',
      summary: {
        totalEvents: last24Hours.length,
        criticalEvents: last24Hours.filter((e) => e.severity === 'CRITICAL').length,
        highEvents: last24Hours.filter((e) => e.severity === 'HIGH').length,
        mediumEvents: last24Hours.filter((e) => e.severity === 'MEDIUM').length,
        lowEvents: last24Hours.filter((e) => e.severity === 'LOW').length,
        blockedIPs: this.blockedIPs.size,
      },
      topThreats: this.getTopThreats(last24Hours),
      recommendations: this.generateRecommendations(last24Hours),
    };

    logger.info('Security report generated', report.summary);
    return report;
  }

  /**
   * Get top threats
   */
  getTopThreats(events) {
    const threatCounts = {};

    events.forEach((event) => {
      if (event.type.includes('threat') || event.type.includes('attack')) {
        threatCounts[event.type] = (threatCounts[event.type] || 0) + 1;
      }
    });

    return Object.entries(threatCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(events) {
    const recommendations = [];

    const criticalEvents = events.filter((e) => e.severity === 'CRITICAL');
    if (criticalEvents.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Investigate critical security events immediately',
        count: criticalEvents.length,
      });
    }

    const bruteForceEvents = events.filter((e) => e.type === 'brute_force_detected');
    if (bruteForceEvents.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Consider implementing stronger authentication policies',
        count: bruteForceEvents.length,
      });
    }

    const blockedIPs = this.blockedIPs.size;
    if (blockedIPs > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Review IP blocking policies and consider geo-blocking',
        count: blockedIPs,
      });
    }

    return recommendations;
  }

  /**
   * Clean old events
   */
  cleanupOldEvents() {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

    this.events = this.events.filter((event) => new Date(event.timestamp).getTime() > cutoffTime);

    // Clean expired IP blocks
    for (const [ip, blockInfo] of this.blockedIPs.entries()) {
      if (Date.now() > blockInfo.blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }

    // Clean old suspicious patterns
    for (const [key, pattern] of this.suspiciousPatterns.entries()) {
      if (Date.now() - pattern.lastSeen > 3600000) {
        // 1 hour
        this.suspiciousPatterns.delete(key);
      }
    }

    logger.debug('Security events cleaned up');
  }

  /**
   * Calculate severity based on risk score
   */
  calculateSeverity(riskScore) {
    if (riskScore >= 8) return 'CRITICAL';
    if (riskScore >= 6) return 'HIGH';
    if (riskScore >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Sanitize details for logging
   */
  sanitizeDetails(details) {
    const sanitized = { ...details };

    // Remove sensitive data
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.token) sanitized.token = '***';
    if (sanitized.authorization) sanitized.authorization = '***';

    // Limit string lengths
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = `${sanitized[key].substring(0, 200)}...`;
      }
    });

    return sanitized;
  }

  /**
   * Get security metrics for API
   */
  getMetrics() {
    const now = Date.now();
    const last24Hours = this.events.filter(
      (event) => now - new Date(event.timestamp).getTime() < 86400000,
    );

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: this.events.length,
        recentEvents: last24Hours.length,
        blockedIPs: this.blockedIPs.size,
        activeAlerts: this.alerts.filter((a) => !a.acknowledged).length,
      },
      eventsBySeverity: {
        critical: last24Hours.filter((e) => e.severity === 'CRITICAL').length,
        high: last24Hours.filter((e) => e.severity === 'HIGH').length,
        medium: last24Hours.filter((e) => e.severity === 'MEDIUM').length,
        low: last24Hours.filter((e) => e.severity === 'LOW').length,
      },
      topThreats: this.getTopThreats(last24Hours),
      blockedIPs: Array.from(this.blockedIPs.entries()).map(([ip, info]) => ({
        ip,
        blockedAt: new Date(info.blockedAt).toISOString(),
        blockedUntil: new Date(info.blockedUntil).toISOString(),
        reason: info.reason,
      })),
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      logger.info('Security alert acknowledged', { alertId });
      return true;
    }
    return false;
  }
}

// Create singleton instance
const securityMonitor = new SecurityMonitor();

module.exports = securityMonitor;
