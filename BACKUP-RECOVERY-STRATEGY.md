# 📦 BACKUP AND RECOVERY STRATEGY

## 🎯 OVERVIEW

Enterprise-grade backup and recovery strategy for financial system to ensure data integrity and business continuity.

## 🗄️ BACKUP STRATEGY

### **1. Automated Daily Backups**

**Database Backups**:
```bash
# Daily full backup (2:00 AM)
0 2 * * * pg_dump -h postgres -U postgres -d lonaat > /backups/daily/lonaat_$(date +\%Y\%m\%d).sql

# Hourly transaction logs (for point-in-time recovery)
0 * * * * pg_dump -h postgres -U postgres -d lonaat --schema=public --data-only --table=Transaction > /backups/hourly/transactions_$(date +\%Y\%m\%d_\%H).sql
```

**Retention Policy**:
- Daily backups: Keep 14 days
- Hourly transaction logs: Keep 7 days  
- Weekly backups: Keep 4 weeks
- Monthly backups: Keep 12 months

### **2. Backup Verification**

**Automated Verification**:
```bash
# Verify backup integrity
#!/bin/bash
BACKUP_FILE=$1
pg_restore --list $BACKUP_FILE > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Backup integrity verified: $BACKUP_FILE"
else
  echo "❌ Backup corruption detected: $BACKUP_FILE"
  # Send alert
  curl -X POST "https://monitoring.example.com/alerts" \
    -d "message=Backup corruption detected: $BACKUP_FILE"
fi
```

**Weekly Restore Test**:
```bash
# Test restore to staging database
pg_restore --clean --if-exists -h postgres-staging -U postgres -d lonaat_staging $BACKUP_FILE
```

### **3. Offsite Storage**

**Cloud Storage**:
```bash
# Upload to AWS S3
aws s3 cp /backups/daily/lonaat_$(date +\%Y\%m\%d).sql s3://lonaat-backups/database/

# Upload to secondary region (disaster recovery)
aws s3 cp s3://lonaat-backups/database/lonaat_$(date +\%Y\%m\%d).sql s3://lonaat-backups-dr/database/ --region us-west-2
```

**Encryption**:
```bash
# Encrypt backups before upload
gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 \
    --output /backups/encrypted/lonaat_$(date +\%Y\%m\%d).sql.gpg \
    /backups/daily/lonaat_$(date +\%Y\%m\%d).sql
```

## 🔄 RECOVERY PROCEDURES

### **1. Point-in-Time Recovery**

**Scenario**: User reports missing transaction from 2 hours ago

```bash
# Step 1: Identify the time window
TARGET_TIME="2024-03-28 15:30:00"

# Step 2: Restore from last daily backup
pg_restore --clean --if-exists -h postgres -U postgres -d lonaat_recovery /backups/daily/lonaat_20240328.sql

# Step 3: Apply transaction logs up to target time
for log_file in /backups/hourly/transactions_20240328_*.sql; do
  if [[ "$log_file" < "transactions_20240328_15.sql" ]]; then
    psql -h postgres -U postgres -d lonaat_recovery < $log_file
  fi
done

# Step 4: Verify data integrity
psql -h postgres -U postgres -d lonaat_recovery -c "
  SELECT COUNT(*) as transaction_count FROM \"Transaction\" WHERE createdAt >= '2024-03-28 14:00:00' AND createdAt <= '2024-03-28 16:00:00';
"
```

### **2. Full System Recovery**

**Scenario**: Complete database corruption

```bash
# Step 1: Stop application services
systemctl stop lonaat-backend
systemctl stop lonaat-frontend

# Step 2: Create emergency backup of current state (if possible)
pg_dump -h postgres -U postgres -d lonaat > /backups/emergency/lonaat_emergency_$(date +\%Y\%m\%d_\%H\%M).sql

# Step 3: Restore from latest verified backup
LATEST_BACKUP=$(ls -t /backups/daily/lonaat_*.sql | head -1)
pg_restore --clean --if-exists -h postgres -U postgres -d lonaat $LATEST_BACKUP

# Step 4: Run data integrity checks
psql -h postgres -U postgres -d lonaat -c "
  -- Check ledger integrity
  SELECT 
    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as net_balance
  FROM \"Transaction\";

  -- Check wallet balance sync
  SELECT 
    w.userId,
    w.balance as wallet_balance,
    (SELECT COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) 
     FROM \"Transaction\" t WHERE t.userId = w.userId) as calculated_balance
  FROM wallet w;
"

# Step 5: Start services
systemctl start lonaat-backend
systemctl start lonaat-frontend

# Step 6: Verify application functionality
curl -f http://localhost:4000/api/health || exit 1
```

### **3. Selective Data Recovery**

**Scenario**: Specific user data corruption

```bash
# Step 1: Export affected user data
pg_dump -h postgres -U postgres -d lonaat \
  --data-only \
  --table=\"Transaction\" \
  --where="userId = 123" \
  > /backups/selective/user_123_transactions_$(date +\%Y\%m\%d).sql

# Step 2: Delete corrupted data
psql -h postgres -U postgres -d lonaat -c "
  DELETE FROM \"Transaction\" WHERE userId = 123;
  DELETE FROM wallet WHERE userId = 123;
"

# Step 3: Restore from clean backup
psql -h postgres -U postgres -d lonaat < /backups/selective/user_123_clean_20240320.sql

# Step 4: Verify recovery
psql -h postgres -U postgres -d lonaat -c "
  SELECT COUNT(*) as transactions FROM \"Transaction\" WHERE userId = 123;
  SELECT * FROM wallet WHERE userId = 123;
"
```

## 🚨 EMERGENCY PROCEDURES

### **1. Immediate Response (First 15 Minutes)**

1. **Assess Impact**: Determine scope of data loss
2. **Stop Services**: Prevent further data corruption
3. **Preserve Evidence**: Don't modify affected systems
4. **Notify Team**: Alert all stakeholders

### **2. Investigation (15-60 Minutes)**

1. **Identify Root Cause**: What caused the issue?
2. **Determine Recovery Point**: When was data last known good?
3. **Select Recovery Strategy**: Full restore vs. point-in-time vs. selective
4. **Estimate Recovery Time**: Set realistic expectations

### **3. Recovery Execution (60+ Minutes)**

1. **Execute Recovery Plan**: Follow documented procedures
2. **Verify Data Integrity**: Run validation checks
3. **Test Functionality**: Ensure application works
4. **Monitor Performance**: Watch for issues

## 📊 MONITORING AND ALERTS

### **Backup Monitoring**

```bash
# Backup success monitoring
#!/bin/bash
if [ ! -f "/backups/daily/lonaat_$(date +\%Y\%m\%d).sql" ]; then
  curl -X POST "https://monitoring.example.com/alerts" \
    -d "message=Daily backup failed for $(date +\%Y\%m\%d)"
  exit 1
fi

# Backup size monitoring
BACKUP_SIZE=$(stat -c%s "/backups/daily/lonaat_$(date +\%Y\%m\%d).sql")
EXPECTED_SIZE=50000000  # 50MB expected minimum
if [ $BACKUP_SIZE -lt $EXPECTED_SIZE ]; then
  curl -X POST "https://monitoring.example.com/alerts" \
    -d "message=Backup size suspiciously small: $BACKUP_SIZE bytes"
fi
```

### **Recovery Time Objectives (RTO)**

| Scenario | Target RTO | Acceptable Data Loss |
|----------|------------|-------------------|
| Single user data | 30 minutes | 5 minutes |
| Partial system | 2 hours | 1 hour |
| Full system | 4 hours | 4 hours |
| Disaster recovery | 24 hours | 24 hours |

### **Recovery Point Objectives (RPO)**

| Data Type | Target RPO | Backup Frequency |
|-----------|------------|-----------------|
| Financial transactions | 5 minutes | Continuous logs |
| User data | 1 hour | Hourly backups |
| System configuration | 24 hours | Daily backups |

## 🧪 TESTING AND VALIDATION

### **Monthly Recovery Drills**

```bash
#!/bin/bash
# Monthly recovery drill script
echo "🧪 Starting monthly recovery drill..."

# Create test environment
docker-compose -f docker-compose.test.yml up -d

# Restore latest backup to test environment
LATEST_BACKUP=$(ls -t /backups/daily/lonaat_*.sql | head -1)
docker exec postgres-test psql -U postgres -d lonaat_test < $LATEST_BACKUP

# Run automated tests
docker exec lonaat-backend-test npm run test:financial
docker exec lonaat-backend-test npm run test:integration

# Generate report
echo "✅ Recovery drill completed successfully" > /reports/recovery_drill_$(date +\%Y\%m\%d).log

# Cleanup
docker-compose -f docker-compose.test.yml down
```

### **Annual Disaster Recovery Test**

Full-scale test including:
- Complete system restore
- Network connectivity verification
- Performance benchmarking
- User acceptance testing
- Documentation updates

## 📞 CONTACTS AND ESCALATION

### **Primary Contacts**
- **Database Administrator**: +237 XXX XXX XXX
- **System Administrator**: +237 XXX XXX XXX  
- **Application Lead**: +237 XXX XXX XXX

### **Escalation Matrix**
| Impact Level | Response Time | Escalation |
|-------------|---------------|------------|
| Minor (1 user) | 30 minutes | Application Lead |
| Moderate (10 users) | 1 hour | System Administrator |
| Major (100+ users) | 30 minutes | Database Administrator |
| Critical (All users) | 15 minutes | All on-call staff |

---

## 📋 CHECKLISTS

### **Daily Backup Checklist**
- [ ] Automated backup completed successfully
- [ ] Backup integrity verified
- [ ] Backup uploaded to cloud storage
- [ ] Backup size within expected range
- [ ] Monitoring alerts checked

### **Weekly Recovery Checklist**
- [ ] Restore test performed on staging
- [ ] Data integrity checks passed
- [ ] Application functionality verified
- [ ] Performance benchmarks met
- [ ] Documentation updated

### **Monthly Checklist**
- [ ] Full recovery drill completed
- [ ] Backup retention policy reviewed
- [ ] Contact information verified
- [ ] Recovery procedures updated
- [ ] Team training conducted

---

**This backup and recovery strategy ensures business continuity and data integrity for the financial system.**
