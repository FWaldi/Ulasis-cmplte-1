# Monitoring System Documentation

## Overview

This document describes the comprehensive monitoring system implemented for the Ulasis backend, providing real-time insights into application performance, security events, and business metrics.

## Monitoring Architecture

### Components

1. **Performance Monitor** (`src/monitoring/performance-monitor.js`)
   - HTTP request tracking
   - Database query monitoring
   - System resource monitoring
   - Business metrics collection

2. **Security Monitor** (`src/monitoring/security-monitor.js`)
   - Intrusion detection
   - Threat analysis
   - IP blocking
   - Security event logging

3. **Monitoring Middleware** (`src/middleware/monitoring.js`)
   - Request/response monitoring
   - Error tracking
   - Business metric integration
   - Enhanced health checks

## Performance Monitoring

### Metrics Collected

#### HTTP Request Metrics
- Total requests count
- Success/failure rates
- Response time distribution
- Error rates by endpoint
- Request patterns analysis

#### Database Metrics
- Connection pool usage
- Query execution times
- Slow query identification
- Connection error tracking
- Query pattern analysis

#### System Metrics
- Memory usage (RSS, heap, external)
- CPU utilization
- Process uptime
- Garbage collection impact

#### Business Metrics
- Active user count
- Questionnaires created
- Responses submitted
- QR codes generated

### Performance Alerts

The system automatically generates alerts for:

- **Slow Response Times**: > 2 seconds
- **High Error Rates**: > 5%
- **Memory Usage**: > 80% of heap
- **Slow Queries**: > 1 second execution time
- **Connection Pool Usage**: > 90%

### Performance Endpoints

#### Enhanced Health Check
```http
GET /api/v1/health/enhanced
```

Response includes:
- Overall system health
- Database connectivity
- Performance metrics
- Security status
- Resource utilization

#### Metrics Endpoint
```http
GET /api/v1/metrics
```

Response includes:
- Real-time performance data
- Security event summary
- Business metrics
- System resource usage

## Security Monitoring

### Threat Detection

#### Automated Detection Rules

1. **Brute Force Detection**
   - Threshold: 5 failed attempts in 5 minutes
   - Action: IP blocking for 10 minutes
   - Severity: HIGH

2. **SQL Injection Detection**
   - Patterns: UNION SELECT, OR 1=1, DROP TABLE
   - Action: Request blocking
   - Severity: CRITICAL

3. **XSS Detection**
   - Patterns: <script>, javascript:, on*=
   - Action: Request blocking
   - Severity: HIGH

4. **Path Traversal Detection**
   - Patterns: ../, %2e%2e%2f
   - Action: Request blocking
   - Severity: MEDIUM

5. **Suspicious User Agents**
   - Patterns: bot, crawler, scanner
   - Action: Monitoring
   - Severity: LOW

#### Security Event Types

- `authentication_failure` - Failed login attempts
- `brute_force_detected` - Brute force attack patterns
- `sql_injection_attempt` - SQL injection attempts
- `xss_attempt` - Cross-site scripting attempts
- `path_traversal_attempt` - Path traversal attempts
- `suspicious_user_agent` - Suspicious client identification
- `rate_limit_abuse` - Rate limit violations
- `ip_blocked` - IP address blocking
- `security_threat_detected` - General threat detection

### Security Features

#### IP Blocking
- Automatic IP blocking for violations
- Configurable block durations
- Temporary and permanent blocks
- Block expiration handling

#### Rate Limiting Integration
- Rate limit hit tracking
- Abuse pattern detection
- Escalation procedures
- Automatic response actions

#### Request Analysis
- Real-time threat scanning
- Pattern matching algorithms
- Risk scoring system
- Automated response actions

### Security Alerts

Security alerts are generated for:
- Critical threats requiring immediate action
- High-severity security events
- Emerging threat patterns
- IP blocking activities

## Monitoring Configuration

### Environment Variables

```bash
# Performance Monitoring
PERFORMANCE_ALERT_RESPONSE_TIME=2000      # Response time threshold (ms)
PERFORMANCE_ALERT_ERROR_RATE=0.05          # Error rate threshold (5%)
PERFORMANCE_ALERT_MEMORY_USAGE=0.8         # Memory usage threshold (80%)
PERFORMANCE_ALERT_SLOW_QUERY=1000          # Slow query threshold (ms)

# Security Monitoring
SECURITY_BRUTE_FORCE_THRESHOLD=5           # Failed attempts
SECURITY_BRUTE_FORCE_WINDOW=300000         # Time window (5 minutes)
SECURITY_RATE_LIMIT_THRESHOLD=20           # Rate limit hits
SECURITY_RATE_LIMIT_WINDOW=60000           # Time window (1 minute)

# Monitoring Settings
MONITORING_RETENTION_HOURS=24              # Metrics retention period
MONITORING_CLEANUP_INTERVAL=3600000        # Cleanup interval (1 hour)
MONITORING_REPORT_INTERVAL=21600000        # Report interval (6 hours)
```

### Alert Thresholds

#### Performance Thresholds
- Response Time: 2000ms (2 seconds)
- Error Rate: 5% of total requests
- Memory Usage: 80% of heap allocation
- CPU Usage: 80% utilization
- Slow Query: 1000ms (1 second)
- Connection Pool: 90% usage

#### Security Thresholds
- Brute Force: 5 attempts in 5 minutes
- Rate Limit Abuse: 20 hits in 1 minute
- Suspicious Activity: 20 events/hour from same IP
- Critical Events: Immediate notification

## Integration with Application

### Middleware Integration

```javascript
const {
  requestMonitor,      // Request/response monitoring
  errorMonitor,        // Error tracking
  ipBlocker,          // IP blocking
  businessMetrics,     // Business metric collection
  enhancedHealthCheck, // Enhanced health endpoint
  metricsEndpoint     // Metrics API endpoint
} = require('./middleware/monitoring');

// Apply middleware
app.use(requestMonitor);
app.use(ipBlocker);
app.use(businessMetrics);
app.use(errorMonitor);
```

### Database Monitoring

```javascript
const { databaseMonitor } = require('./middleware/monitoring');

// Monitor database queries
const monitoredQuery = databaseMonitor(originalQuery);
const result = await monitoredQuery.execute();
```

### Custom Business Metrics

```javascript
const performanceMonitor = require('./monitoring/performance-monitor');

// Record custom business events
performanceMonitor.recordBusinessMetric('custom_event', {
  userId: 123,
  action: 'purchase',
  value: 99.99
});
```

## Monitoring Data

### Data Retention

- **Request Metrics**: 24 hours
- **Security Events**: 7 days
- **Performance Data**: 24 hours
- **IP Blocks**: Until expiration
- **Alerts**: Until acknowledged

### Data Storage

- In-memory storage for real-time access
- Periodic cleanup to prevent memory leaks
- Configurable retention periods
- Automatic data aggregation

### Export Capabilities

- JSON format via API endpoints
- Real-time streaming capabilities
- Historical data access
- Custom metric queries

## Alerting and Notification

### Alert Types

1. **Performance Alerts**
   - Slow response times
   - High error rates
   - Resource exhaustion
   - Database issues

2. **Security Alerts**
   - Intrusion attempts
   - Brute force attacks
   - Suspicious activities
   - IP blocking events

3. **System Alerts**
   - Memory leaks
   - CPU spikes
   - Disk space issues
   - Process failures

### Notification Channels

#### Console Logging
- Real-time console output
- Structured log format
- Severity-based filtering
- Request correlation IDs

#### File Logging
- Persistent log storage
- Log rotation policies
- Compressed archives
- Configurable retention

#### External Integration (Future)
- Email notifications
- Slack integration
- PagerDuty alerts
- Webhook notifications

## Performance Optimization

### Monitoring Overhead

The monitoring system is designed for minimal performance impact:

- **Asynchronous Operations**: Non-blocking data collection
- **Memory Efficient**: Automatic cleanup and retention
- **Optimized Algorithms**: Efficient pattern matching
- **Selective Monitoring**: Configurable monitoring levels

### Resource Usage

- **Memory**: < 50MB additional overhead
- **CPU**: < 2% additional processing
- **Storage**: Minimal disk I/O
- **Network**: No external dependencies

## Security Considerations

### Data Protection

- **Sanitization**: Sensitive data removal from logs
- **Encryption**: Secure data transmission
- **Access Control**: Restricted metric access
- **Audit Trail**: Complete monitoring audit log

### Privacy Compliance

- **PII Protection**: Personal information masking
- **Data Minimization**: Only necessary data collection
- **Retention Policies**: GDPR-compliant data retention
- **User Rights**: Data deletion capabilities

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check monitoring metrics
curl http://localhost:3000/api/v1/metrics

# Review memory trends
grep "memory" logs/application.log
```

#### Missing Security Events
```bash
# Check security monitor status
curl http://localhost:3000/api/v1/metrics | jq '.security'

# Review security logs
grep "security" logs/application.log
```

#### Performance Alerts
```bash
# Check performance metrics
curl http://localhost:3000/api/v1/health/enhanced

# Review slow queries
grep "slow query" logs/application.log
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
DEBUG=monitoring:* npm run dev
```

### Health Check Status

```bash
# Basic health check
curl http://localhost:3000/api/v1/health

# Enhanced health check
curl http://localhost:3000/api/v1/health/enhanced

# Full metrics
curl http://localhost:3000/api/v1/metrics
```

## Best Practices

### Performance Monitoring

1. **Regular Review**: Daily performance summary review
2. **Threshold Tuning**: Adjust alert thresholds based on patterns
3. **Trend Analysis**: Monitor long-term performance trends
4. **Capacity Planning**: Use metrics for scaling decisions

### Security Monitoring

1. **Event Review**: Regular security event analysis
2. **Pattern Updates**: Update detection rules regularly
3. **Incident Response**: Establish security incident procedures
4. **Compliance**: Ensure monitoring meets security standards

### System Maintenance

1. **Log Rotation**: Implement proper log rotation
2. **Storage Management**: Monitor disk space usage
3. **Backup Monitoring**: Include monitoring in backup strategy
4. **Documentation**: Keep monitoring documentation current

## API Reference

### Health Endpoints

#### GET /api/v1/health
Basic health check with database connectivity.

#### GET /api/v1/health/enhanced
Comprehensive health check with performance and security metrics.

### Metrics Endpoints

#### GET /api/v1/metrics
Complete monitoring metrics including performance and security data.

### Response Formats

#### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2023-10-26T10:00:00.000Z",
  "responseTime": "45ms",
  "checks": {
    "database": { "status": "healthy" },
    "system": { "status": "healthy" },
    "performance": { "status": "healthy" },
    "security": { "status": "healthy" }
  }
}
```

#### Metrics Response
```json
{
  "timestamp": "2023-10-26T10:00:00.000Z",
  "performance": {
    "requests": {
      "total": 1000,
      "averageResponseTime": 150,
      "errorRate": 0.02
    },
    "database": {
      "connectionPool": { "used": 5, "max": 20 },
      "averageQueryTime": 25
    },
    "system": {
      "memory": { "usage": 0.65, "used": "325MB" }
    }
  },
  "security": {
    "summary": {
      "totalEvents": 10,
      "blockedIPs": 2,
      "activeAlerts": 0
    }
  }
}
```

## Future Enhancements

### Planned Features

1. **Dashboard Interface**: Web-based monitoring dashboard
2. **Alert Integration**: Email, Slack, PagerDuty notifications
3. **Advanced Analytics**: Machine learning anomaly detection
4. **Distributed Tracing**: Request tracing across services
5. **Custom Metrics**: User-defined metric collection
6. **Export Capabilities**: CSV, PDF report generation
7. **API Rate Limiting**: Advanced rate limiting strategies
8. **Geographic Analysis**: IP geographic location tracking

### Integration Opportunities

1. **APM Tools**: New Relic, DataDog, AppDynamics
2. **Log Aggregation**: ELK Stack, Splunk, Fluentd
3. **Time Series Databases**: InfluxDB, Prometheus
4. **Container Monitoring**: Kubernetes, Docker metrics
5. **Cloud Monitoring**: AWS CloudWatch, Azure Monitor

## Support and Maintenance

### Monitoring Team

- **Primary**: monitoring-team@example.com
- **Escalation**: lead-engineer@example.com
- **On-Call**: oncall-engineer@example.com

### Documentation Updates

- **Review Schedule**: Monthly
- **Update Process**: Pull request review
- **Version Control**: Git-based documentation
- **Change Log**: Maintained in repository

### Training Resources

- **Internal Wiki**: Monitoring best practices
- **Video Tutorials**: Monitoring system overview
- **Documentation**: API reference and guides
- **Workshops**: Regular training sessions