# Database Backup Strategy

## Overview

This document describes the comprehensive backup strategy for the Ulasis database, including automated backups, retention policies, verification procedures, and recovery processes.

## Backup Architecture

### Backup Components

1. **Automated Backup Script** (`scripts/backup-database.js`)
   - Creates full database dumps
   - Compresses backups with gzip
   - Optional encryption with AES-256-CBC
   - Generates checksums for integrity verification
   - Maintains backup metadata

2. **Restore Script** (`scripts/restore-database.js`)
   - Decrypts and decompresses backups
   - Verifies integrity before restore
   - Creates pre-restore backups
   - Supports point-in-time recovery

3. **Verification Script** (`scripts/verify-backup.js`)
   - Validates backup integrity
   - Tests restore procedures
   - Verifies SQL structure
   - Batch verification of all backups

### Backup Process Flow

```
Database → mysqldump → Compression → Encryption → Checksum → Metadata → Storage
```

## Configuration

### Environment Variables

```bash
# Backup Configuration
BACKUP_DIR=/path/to/backups                    # Backup storage directory
BACKUP_COMPRESSION_LEVEL=6                     # Gzip compression level (1-9)
BACKUP_ENCRYPTION_ENABLED=true                  # Enable backup encryption
BACKUP_ENCRYPTION_KEY=your-256-bit-key         # AES-256 encryption key
BACKUP_RETENTION_DAYS=30                        # Days to retain backups
BACKUP_MAX_COUNT=10                            # Maximum number of backups to keep

# Database Configuration (from database-security.js)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ulasis
DB_USER=backup_user
DB_PASSWORD=secure_password
DB_SSL_REQUIRE=true
```

### Security Considerations

1. **Encryption Keys**
   - Use 256-bit encryption keys
   - Store keys securely (environment variables, key management service)
   - Rotate keys periodically

2. **Access Control**
   - Dedicated backup user with read-only permissions
   - Restrict backup directory access
   - Audit backup access logs

3. **Network Security**
   - Use SSL/TLS for remote database connections
   - Secure backup storage location
   - Encrypt backups during transport

## Backup Procedures

### Manual Backup

```bash
# Create a backup
node scripts/backup-database.js backup

# List available backups
node scripts/backup-database.js list
```

### Automated Backup Setup

#### Cron Job (Linux/macOS)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/ulasis/Backend && node scripts/backup-database.js backup >> /var/log/ulasis-backup.log 2>&1

# Add weekly verification (Sundays at 3 AM)
0 3 * * 0 cd /path/to/ulasis/Backend && node scripts/verify-backup.js verify-all >> /var/log/ulasis-backup-verify.log 2>&1
```

#### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `node`
   - Arguments: `scripts\backup-database.js backup`
   - Start in: `D:\path\to\ulasis\Backend`

### Backup Verification

```bash
# Verify specific backup
node scripts/verify-backup.js verify ulasis-backup-2023-10-26.sql.gz.enc

# Test restore procedure (dry run)
node scripts/verify-backup.js test-restore ulasis-backup-2023-10-26.sql.gz.enc

# Verify all backups
node scripts/verify-backup.js verify-all
```

## Restore Procedures

### Emergency Restore

```bash
# List available backups
node scripts/restore-database.js list

# Restore from backup (creates pre-restore backup automatically)
node scripts/restore-database.js restore ulasis-backup-2023-10-26.sql.gz.enc

# Restore without pre-restore backup (advanced)
node scripts/restore-database.js restore ulasis-backup-2023-10-26.sql.gz.enc --skip-pre-restore-backup
```

### Point-in-Time Recovery

1. **Identify Target Backup**
   ```bash
   node scripts/restore-database.js list
   ```

2. **Verify Backup Integrity**
   ```bash
   node scripts/verify-backup.js verify <backup-file>
   ```

3. **Perform Restore**
   ```bash
   node scripts/restore-database.js restore <backup-file>
   ```

4. **Verify Database**
   ```bash
   # Check database connectivity
   node scripts/test-db-connection.js
   
   # Verify table structure
   mysql -u user -p ulasis -e "SHOW TABLES;"
   ```

## Retention Policy

### Backup Retention Rules

1. **Daily Backups**: Retain for 30 days
2. **Weekly Backups**: Retain for 12 weeks
3. **Monthly Backups**: Retain for 12 months
4. **Annual Backups**: Retain for 7 years

### Automatic Cleanup

The backup script automatically:
- Deletes backups older than retention period
- Maintains maximum backup count
- Preserves at least one backup per week for the last month
- Preserves at least one backup per month for the last year

### Manual Cleanup

```bash
# View backup ages
ls -la backups/ulasis-backup-*

# Remove specific backup (use with caution)
rm backups/ulasis-backup-2023-09-01.sql.gz.enc
rm backups/ulasis-backup-2023-09-01.sql.gz.enc.meta.json
```

## Monitoring and Alerting

### Backup Success Monitoring

```bash
# Check backup logs
tail -f /var/log/ulasis-backup.log

# Verify recent backups
find backups/ -name "ulasis-backup-*.sql*" -mtime -1 -ls
```

### Alerting Setup

#### Email Alerts (Linux)

```bash
# Add to backup script
if [ $? -eq 0 ]; then
    echo "Backup successful: $(date)" | mail -s "Ulasis Backup Success" admin@example.com
else
    echo "Backup failed: $(date)" | mail -s "Ulasis Backup FAILED" admin@example.com
fi
```

#### Slack Integration

```javascript
// Add to backup script
const notifySlack = async (message) => {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  }
};
```

## Disaster Recovery

### Recovery Time Objective (RTO): 4 hours
### Recovery Point Objective (RPO): 24 hours

### Disaster Recovery Steps

1. **Assess Impact**
   - Identify affected systems
   - Determine data loss scope
   - Estimate recovery timeline

2. **Prepare Environment**
   - Provision new database server
   - Configure network connectivity
   - Install required software

3. **Restore Data**
   - Transfer backup files to new server
   - Decrypt and decompress backups
   - Execute database restore

4. **Verify Recovery**
   - Test database connectivity
   - Validate data integrity
   - Run application tests

5. **Restore Service**
   - Update application configuration
   - Restart application services
   - Monitor system performance

### Off-Site Backup Strategy

1. **Cloud Storage**
   - AWS S3 with lifecycle policies
   - Google Cloud Storage with archiving
   - Azure Blob Storage with tiered storage

2. **Replication**
   - Database replication to secondary site
   - Real-time sync for critical data
   - Periodic full backup verification

## Testing and Validation

### Monthly Testing

1. **Backup Verification**
   ```bash
   node scripts/verify-backup.js verify-all
   ```

2. **Restore Testing**
   - Restore to test environment
   - Validate data integrity
   - Test application functionality

3. **Performance Testing**
   - Measure backup creation time
   - Test restore performance
   - Validate storage requirements

### Quarterly Drills

1. **Full Disaster Recovery Test**
   - Complete system restore
   - End-to-end validation
   - Documentation updates

2. **Security Validation**
   - Test encryption/decryption
   - Validate access controls
   - Review audit logs

## Troubleshooting

### Common Issues

#### Backup Fails with Permission Error

```bash
# Check database user permissions
mysql -u backup_user -p -e "SHOW GRANTS FOR CURRENT_USER();"

# Grant required permissions
GRANT SELECT, LOCK TABLES, SHOW VIEW ON *.* TO 'backup_user'@'%';
FLUSH PRIVILEGES;
```

#### Restore Fails with Encryption Error

```bash
# Verify encryption key
echo $BACKUP_ENCRYPTION_KEY

# Test decryption
node scripts/verify-backup.js verify <backup-file>
```

#### Disk Space Issues

```bash
# Check available space
df -h /path/to/backups

# Clean old backups
node scripts/backup-database.js backup  # This will trigger cleanup
```

### Log Analysis

```bash
# Backup logs
tail -100 /var/log/ulasis-backup.log | grep ERROR

# Database logs
tail -100 /var/log/mysql/error.log

# System logs
journalctl -u mysql -f
```

## Best Practices

1. **3-2-1 Rule**
   - 3 copies of data
   - 2 different media types
   - 1 off-site copy

2. **Regular Testing**
   - Monthly backup verification
   - Quarterly restore testing
   - Annual disaster recovery drill

3. **Documentation**
   - Maintain current procedures
   - Update contact information
   - Document lessons learned

4. **Security**
   - Encrypt all backups
   - Secure encryption keys
   - Regular access reviews

5. **Monitoring**
   - Backup success/failure alerts
   - Storage capacity monitoring
   - Performance metrics tracking

## Compliance

### Data Retention Compliance

- **GDPR**: Right to be forgotten through secure deletion
- **SOC 2**: Backup and recovery procedures documented
- **ISO 27001**: Information security management
- **HIPAA**: Protected health information safeguards

### Audit Requirements

- Backup logs retained for 1 year
- Access logs reviewed quarterly
- Encryption key rotation documented
- Recovery test results archived

## Contact Information

### Primary Contacts
- **Database Administrator**: dba@example.com
- **System Administrator**: sysadmin@example.com
- **Security Officer**: security@example.com

### Emergency Contacts
- **On-Call Engineer**: oncall@example.com
- **Management**: management@example.com

### Service Providers
- **Cloud Provider**: support@cloud-provider.com
- **Backup Software Vendor**: support@backup-vendor.com