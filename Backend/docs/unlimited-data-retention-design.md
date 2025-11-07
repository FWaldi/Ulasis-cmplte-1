# Unlimited Data Retention Design

## Overview

This document outlines the database schema design for unlimited data retention across all subscription plans in the Ulasis platform. The design ensures that no data is automatically expired or deleted, providing users with complete data persistence.

## Design Principles

### 1. No Automatic Data Expiration
- **No TTL fields**: No `expires_at` or `ttl` columns that would trigger automatic deletion
- **No cleanup jobs**: No scheduled tasks that remove old data
- **Permanent storage**: All data is stored indefinitely unless manually deleted by users

### 2. Performance Optimization for Large Datasets
- **Strategic indexing**: Optimized indexes for queries on large tables
- **Partitioning-ready**: Schema designed for future horizontal partitioning
- **Efficient data types**: Using appropriate data types to minimize storage overhead

### 3. Scalability Considerations
- **BIGINT primary keys**: Support for large numbers of records
- **Soft deletes**: Data is marked as deleted rather than physically removed
- **Audit trails**: Complete history of changes through timestamps

## Table-Specific Design

### Users Table
```sql
- No subscription-based data limits
- Subscription plan affects features, not data retention
- Soft delete support with `deleted_at` column
- Historical subscription data preserved
```

### Questionnaires Table
```sql
- Unlimited questionnaires per user
- Response count tracking for analytics
- No automatic archiving of old questionnaires
- Soft delete with `deleted_at` column
```

### Questions Table
```sql
- Unlimited questions per questionnaire
- Version history through `updated_at` timestamps
- Soft delete support for question recovery
- No limit on question complexity or options
```

### QR Codes Table
```sql
- Unlimited QR codes per questionnaire
- Scan tracking without data purging
- Historical scan data preserved indefinitely
- Performance indexes on scan counts and dates
```

### Responses Table
```sql
- Unlimited responses per questionnaire
- Complete response history preserved
- Device fingerprinting for duplicate detection
- Geographic and metadata storage for analytics
```

### Answers Table
```sql
- Unlimited answers per response
- Support for complex data types (JSON, files)
- Validation history preserved
- Rating and scoring data retained indefinitely
```

### Reviews Table
```sql
- Complete moderation history
- Escalation tracking without limits
- Audit trail of all review actions
- Quality scoring history preserved
```

## Indexing Strategy

### Primary Indexes
- All tables use `BIGINT UNSIGNED` auto-increment primary keys
- Supports billions of records per table

### Performance Indexes
- **Date-based indexes**: `created_at`, `updated_at`, `response_date`
- **Foreign key indexes**: All relationships properly indexed
- **Query-specific indexes**: Composite indexes for common query patterns
- **Status indexes**: `is_active`, `is_complete`, `review_status`

### Composite Indexes
- `questionnaire_id + response_date`: Fast response retrieval
- `user_id + created_at`: User activity queries
- `question_id + rating_score`: Analytics queries
- `review_status + priority`: Moderation queue queries

## Storage Optimization

### Data Types
- **BIGINT**: For IDs and counters (supports up to 18 quintillion records)
- **JSON**: For flexible metadata storage
- **TEXT**: For variable-length content
- **DATETIME**: With timezone support for global applications

### Character Set
- **utf8mb4**: Full Unicode support including emojis
- **utf8mb4_unicode_ci**: Case-insensitive collation for searches

### Engine Configuration
- **InnoDB**: Transactional support with row-level locking
- **Compression**: Enabled for large text fields
- **File-per-table**: For easier maintenance and backup

## Future Enhancements

### Partitioning Strategy
When data grows very large, the following partitioning strategies can be implemented:

1. **Range Partitioning by Date**
   ```sql
   PARTITION BY RANGE (YEAR(created_at)) (
     PARTITION p2023 VALUES LESS THAN (2024),
     PARTITION p2024 VALUES LESS THAN (2025),
     PARTITION p2025 VALUES LESS THAN (2026)
   )
   ```

2. **Hash Partitioning by User ID**
   ```sql
   PARTITION BY HASH(user_id) PARTITIONS 16
   ```

3. **Composite Partitioning**
   ```sql
   PARTITION BY RANGE (YEAR(created_at))
   SUBPARTITION BY HASH(user_id) SUBPARTITIONS 8
   ```

### Archiving Strategy
While data is retained indefinitely, archiving can be implemented for performance:

1. **Cold Storage**: Move old data to cheaper storage
2. **Compression**: Compress historical data
3. **Read Replicas**: Offload reporting queries to replicas

## Monitoring and Maintenance

### Performance Monitoring
- Query execution time tracking
- Index usage statistics
- Table size monitoring
- Storage growth projections

### Maintenance Tasks
- Regular index optimization
- Statistics updates
- Backup verification
- Storage capacity planning

## Security Considerations

### Data Privacy
- GDPR compliance through data export/deletion APIs
- Encryption at rest and in transit
- Access control based on user permissions

### Data Integrity
- Foreign key constraints
- Transaction isolation
- Regular integrity checks
- Backup and recovery procedures

## Conclusion

This design ensures unlimited data retention while maintaining performance and scalability. The schema is optimized for large datasets and provides a foundation for future growth without data loss concerns.