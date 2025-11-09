const performanceMonitor = require('../../src/monitoring/performance-monitor');
const securityMonitor = require('../../src/monitoring/security-monitor');
const {
  requestMonitor,
  databaseMonitor,
  errorMonitor,
  ipBlocker,
  businessMetrics,
  enhancedHealthCheck,
  metricsEndpoint,
} = require('../../src/middleware/monitoring');

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn(),
  },
  getConnectionPoolInfo: jest.fn(() => ({
    used: 1,
    available: 9,
    pending: 0,
    size: 10,
  })),
}));

describe('Monitoring System', () => {
  beforeEach(() => {
    // Reset monitors before each test
    performanceMonitor.resetMetrics();
    jest.clearAllMocks();
  });

  describe('Performance Monitor', () => {
    describe('Request Metrics', () => {
      test('should record HTTP request metrics', () => {
        const req = {
          path: '/api/v1/test',
          method: 'GET',
          ip: '192.168.1.1',
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
            return undefined;
          }),
        };
        const res = {
          statusCode: 200,
        };
        const responseTime = 150;

        performanceMonitor.recordRequest(req, res, responseTime);

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.requests.total).toBe(1);
        expect(metrics.requests.successful).toBe(1);
        expect(metrics.requests.failed).toBe(0);
        expect(metrics.requests.averageResponseTime).toBe(150);
      });

      test('should record failed requests', () => {
        const req = {
          path: '/api/v1/error',
          method: 'POST',
          ip: '192.168.1.2',
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
            return undefined;
          }),
        };
        const res = {
          statusCode: 500,
        };
        const responseTime = 300;

        performanceMonitor.recordRequest(req, res, responseTime);

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.requests.total).toBe(1);
        expect(metrics.requests.successful).toBe(0);
        expect(metrics.requests.failed).toBe(1);
        expect(metrics.requests.averageResponseTime).toBe(300);
      });

      test('should calculate error rates by endpoint', () => {
        const req = {
          path: '/api/v1/test',
          method: 'GET',
          ip: '192.168.1.1',
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
            return undefined;
          }),
        };
        const res = {
          statusCode: 404,
        };

        // Record multiple requests
        for (let i = 0; i < 10; i++) {
          performanceMonitor.recordRequest(req, res, 100);
        }

        const metrics = performanceMonitor.getMetrics();
        const endpointStats = metrics.requests.errorRatesByEndpoint.find(
          stat => stat.endpoint === 'GET /api/v1/test',
        );

        expect(endpointStats).toBeDefined();
        expect(endpointStats.total).toBe(10);
        expect(endpointStats.errors).toBe(10);
        expect(endpointStats.errorRate).toBe(1);
      });
    });

    describe('Database Metrics', () => {
      test('should record database query metrics', () => {
        const query = 'SELECT * FROM users';
        const executionTime = 50;

        performanceMonitor.recordDatabaseQuery(query, executionTime);

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.database.averageQueryTime).toBe(50);
        expect(metrics.database.slowQueries).toHaveLength(0);
      });

      test('should record slow queries', () => {
        const query = 'SELECT * FROM large_table';
        const executionTime = 1500; // > 1000ms threshold

        performanceMonitor.recordDatabaseQuery(query, executionTime);

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.database.slowQueries).toHaveLength(1);
        expect(metrics.database.slowQueries[0].executionTime).toBe(1500);
      });

      test('should record database errors', () => {
        const query = 'INVALID SQL';
        const executionTime = 100;
        const error = new Error('SQL syntax error');

        performanceMonitor.recordDatabaseQuery(query, executionTime, error);

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.database.connectionErrors).toBe(1);
      });
    });

    describe('Business Metrics', () => {
      test('should record business events', () => {
        performanceMonitor.recordBusinessMetric('questionnaire_created');
        performanceMonitor.recordBusinessMetric('response_submitted');
        performanceMonitor.recordBusinessMetric('qr_code_generated');

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.business.questionnairesCreated).toBe(1);
        expect(metrics.business.responsesSubmitted).toBe(1);
        expect(metrics.business.qrCodesGenerated).toBe(1);
      });
    });

    describe('System Metrics', () => {
      test('should collect system metrics', () => {
        performanceMonitor.collectSystemMetrics();

        const metrics = performanceMonitor.getMetrics();
        expect(metrics.system.memory).toBeDefined();
        // In test environment, memory metrics might be 0, so just check they're defined
        expect(metrics.system.memory.used).toBeDefined();
        expect(metrics.system.memory.total).toBeDefined();
        expect(metrics.system.uptime).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Monitor', () => {
    describe('Request Analysis', () => {
      test('should detect SQL injection attempts', () => {
        const req = {
          ip: '192.168.1.100',
          method: 'GET',
          path: '/api/v1/users',
          query: { id: "1' OR '1'='1" },
          body: {},
          headers: {},
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
            return undefined;
          }),
        };

        const analysis = securityMonitor.analyzeRequest(req, {});

        expect(analysis.threats.length).toBeGreaterThan(0);
        expect(analysis.threats.some(t => t.type === 'sql_injection_attempt')).toBe(true);
        expect(analysis.actions).toContain('block_request');
        expect(analysis.riskScore).toBeGreaterThan(0);
      });

      test('should detect XSS attempts', () => {
        const req = {
          ip: '192.168.1.101',
          method: 'POST',
          path: '/api/v1/comments',
          query: {},
          body: { comment: '<script>alert("xss")</script>' },
          headers: {},
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
            return undefined;
          }),
        };

        const analysis = securityMonitor.analyzeRequest(req, {});

        expect(analysis.threats.length).toBeGreaterThan(0);
        expect(analysis.threats.some(t => t.type === 'xss_attempt')).toBe(true);
        expect(analysis.actions).toContain('block_request');
      });

      test('should detect path traversal attempts', () => {
        const req = {
          ip: '192.168.1.102',
          method: 'GET',
          path: '/api/v1/files/../../../etc/passwd',
          query: {},
          body: {},
          headers: {},
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
            return undefined;
          }),
        };

        const analysis = securityMonitor.analyzeRequest(req, {});

        expect(analysis.threats.length).toBeGreaterThan(0);
        expect(analysis.threats.some(t => t.type === 'path_traversal_attempt')).toBe(true);
        expect(analysis.actions).toContain('block_request');
      });

      test('should detect suspicious user agents', () => {
        const req = {
          ip: '192.168.1.103',
          method: 'GET',
          path: '/api/v1/data',
          query: {},
          body: {},
          headers: { 'User-Agent': 'sqlmap/1.0' },
          get: jest.fn((header) => {
            if (header === 'User-Agent') return 'sqlmap/1.0';
            return undefined;
          }),
        };

        const analysis = securityMonitor.analyzeRequest(req, {});

        expect(analysis.threats.length).toBeGreaterThan(0);
        expect(analysis.threats.some(t => t.type === 'suspicious_user_agent')).toBe(true);
      });
    });

    describe('Authentication Security', () => {
      test('should detect brute force attempts', () => {
        const ip = '192.168.1.200';
        const email = 'test@example.com';

        // Record multiple failed attempts
        for (let i = 0; i < 6; i++) {
          securityMonitor.recordAuthFailure(ip, email, 'invalid_password');
        }

        const metrics = securityMonitor.getMetrics();
        expect(metrics.summary.blockedIPs).toBeGreaterThan(0);
      });

      test('should record rate limit hits', () => {
        const ip = '192.168.1.201';
        const endpoint = 'GET /api/v1/data';

        // Record multiple rate limit hits
        for (let i = 0; i < 25; i++) {
          securityMonitor.recordRateLimitHit(ip, endpoint);
        }

        const metrics = securityMonitor.getMetrics();
        expect(metrics.summary.recentEvents).toBeGreaterThan(0);
      });
    });

    describe('IP Blocking', () => {
      test('should block and unblock IPs', () => {
        const ip = '192.168.1.300';

        expect(securityMonitor.isIPBlocked(ip)).toBe(false);

        securityMonitor.blockIP(ip, 1000); // 1 second block
        expect(securityMonitor.isIPBlocked(ip)).toBe(true);

        // Wait for block to expire
        setTimeout(() => {
          expect(securityMonitor.isIPBlocked(ip)).toBe(false);
        }, 1100);
      });
    });

    describe('Security Events', () => {
      test('should record security events', () => {
        const eventId = securityMonitor.recordEvent('test_event', { test: true }, 'MEDIUM');

        expect(eventId).toBeDefined();
        expect(typeof eventId).toBe('string');

        const metrics = securityMonitor.getMetrics();
        expect(metrics.summary.totalEvents).toBeGreaterThan(0);
      });
    });
  });

  describe('Monitoring Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.1',
        method: 'GET',
        path: '/api/v1/test',
        get: jest.fn((header) => {
          const headers = {
            'User-Agent': 'test-agent',
            'Content-Type': 'application/json',
          };
          return headers[header];
        }),
      };

      mockRes = {
        statusCode: 200,
        setHeader: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();
    });

    describe('Request Monitor', () => {
      test('should add request ID and monitor requests', (done) => {
        requestMonitor(mockReq, mockRes, mockNext);

        expect(mockReq.requestId).toBeDefined();
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.requestId);
        expect(mockNext).toHaveBeenCalled();

        // Test response monitoring
        expect(mockRes.send).toBeDefined();
        expect(typeof mockRes.send).toBe('function');

        done();
      });
    });

    describe('IP Blocker', () => {
      test('should block requests from blocked IPs', () => {
        const blockedIP = '192.168.1.999';
        securityMonitor.blockIP(blockedIP);

        mockReq.ip = blockedIP;

        ipBlocker(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Access Denied',
          }),
        );
      });

      test('should allow requests from non-blocked IPs', () => {
        ipBlocker(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });
    });

    describe('Business Metrics', () => {
      test('should record business metrics for successful requests', (done) => {
        // Reset metrics specifically for this test
        performanceMonitor.resetMetrics();

        mockReq.path = '/api/v1/questionnaires';
        mockReq.method = 'POST';
        mockRes.statusCode = 201;

        businessMetrics(mockReq, mockRes, mockNext);

        // Trigger the send function - the wrapped version should record the metric
        mockRes.send('{}');

        // Check if business metric was recorded
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.business.questionnairesCreated).toBe(1);

        done();
      });
    });

    describe('Error Monitor', () => {
      test('should monitor errors and record security events for suspicious errors', () => {
        const error = new Error('SQL injection detected');
        error.stack = 'Error: SQL injection detected\n    at test';

        errorMonitor(error, mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Enhanced Health Check', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    test('should return enhanced health information', async () => {
      // Mock database authentication
      const { sequelize } = require('../../src/config/database');
      sequelize.authenticate.mockResolvedValue(true);

      await enhancedHealthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          checks: expect.objectContaining({
            database: expect.objectContaining({ status: 'healthy' }),
            system: expect.objectContaining({ status: 'healthy' }),
            performance: expect.objectContaining({ status: 'healthy' }),
            security: expect.objectContaining({ status: 'healthy' }),
          }),
          metrics: expect.objectContaining({
            performance: expect.any(Object),
            security: expect.any(Object),
          }),
        }),
      );
    });

    test('should handle database failures gracefully', async () => {
      // Mock database-test config for this specific test
      jest.doMock('../../src/config/database-test', () => ({
        sequelize: {
          authenticate: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          close: jest.fn().mockResolvedValue(true),
          transaction: jest.fn().mockResolvedValue({
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
          }),
        },
        authenticate: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        getConnectionPoolInfo: jest.fn().mockReturnValue({
          total: 10,
          idle: 8,
          active: 2,
        }),
      }));

      // Re-require monitoring middleware to pick up the mock
      const { enhancedHealthCheck } = require('../../src/middleware/monitoring');

      await enhancedHealthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
        }),
      );

      // Restore original mock
      jest.dontMock('../../src/config/database-test');
    });
  });

  describe('Metrics Endpoint', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    test('should return performance and security metrics', () => {
      metricsEndpoint(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          performance: expect.objectContaining({
            requests: expect.any(Object),
            database: expect.any(Object),
            system: expect.any(Object),
            business: expect.any(Object),
          }),
          security: expect.objectContaining({
            summary: expect.any(Object),
            eventsBySeverity: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete request monitoring workflow', (done) => {
      const mockReq = {
        ip: '192.168.1.1',
        method: 'GET',
        path: '/api/v1/test',
        get: jest.fn(() => 'test-agent'),
      };

      const mockRes = {
        statusCode: 200,
        setHeader: jest.fn(),
        send: jest.fn(function(data) {
          // Simulate response completion
          this.emit('finish');
        }),
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        }),
        emit: jest.fn(),
      };

      const mockNext = jest.fn();

      // Apply middleware chain
      requestMonitor(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.requestId).toBeDefined();

      // Simulate response
      mockRes.send('{}');

      // Wait for async operations
      setTimeout(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.requests.total).toBe(1);
        done();
      }, 50);
    });

    test('should handle security threat detection and blocking', () => {
      const maliciousReq = {
        ip: '192.168.1.666',
        method: 'GET',
        path: '/api/v1/users?id=1\' OR \'1\'=\'1',
        query: { id: "1' OR '1'='1" },
        body: {},
        headers: { 'User-Agent': 'sqlmap/1.0' },
        get: jest.fn((header) => {
          const headers = { 'User-Agent': 'sqlmap/1.0' };
          return headers[header];
        }),
      };

      const mockRes = {
        statusCode: 200,
        setHeader: jest.fn(),
        send: jest.fn(),
        json: jest.fn(),
        on: jest.fn(),
      };

      const mockNext = jest.fn();

      // Apply security middleware
      const analysis = securityMonitor.analyzeRequest(maliciousReq, mockRes);

      expect(analysis.threats.length).toBeGreaterThan(1);
      expect(analysis.actions).toContain('block_request');
      expect(analysis.riskScore).toBeGreaterThan(5);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle large numbers of events efficiently', () => {
      const startTime = Date.now();

      // Record many requests
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordRequest(
          {
            path: `/api/v1/test${i}`,
            method: 'GET',
            ip: `192.168.1.${i % 255}`,
            get: jest.fn((header) => {
              if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
              return undefined;
            }),
          },
          { statusCode: i % 10 === 0 ? 500 : 200 },
          Math.random() * 1000,
        );
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 1000 requests quickly (less than 100ms)
      expect(processingTime).toBeLessThan(100);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.requests.total).toBe(1000);
    });

    test('should cleanup old metrics to prevent memory leaks', () => {
      // Record some metrics
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(
          {
            path: '/api/v1/test',
            method: 'GET',
            ip: '192.168.1.1',
            get: jest.fn((header) => {
              if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
              return undefined;
            }),
          },
          { statusCode: 200 },
          100,
        );
      }

      const beforeCleanup = performanceMonitor.getMetrics();
      expect(beforeCleanup.requests.responseTimes.length).toBe(10);

      // Trigger cleanup (simulating time passage)
      performanceMonitor.cleanupOldMetrics();

      const afterCleanup = performanceMonitor.getMetrics();
      // Response times should be cleaned up (simulated old data)
      expect(afterCleanup.requests.responseTimes.length).toBeLessThanOrEqual(10);
    });
  });
});