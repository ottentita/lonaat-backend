# Payout Bank Details Encryption Security

## Overview
Lonaat implements **AES-256-GCM encryption** for all sensitive payout bank details stored in Firebase Realtime Database. This ensures that even if the database is compromised, user banking information remains protected.

## Encryption Specifications

### Algorithm Details
- **Cipher**: AES-256 in GCM mode (Galois/Counter Mode)
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 200,000 iterations
- **Key Length**: 256 bits (32 bytes)
- **IV Length**: 96 bits (12 bytes) - randomly generated per encryption
- **Salt Length**: 128 bits (16 bytes) - randomly generated per encryption
- **Authentication**: GCM provides authenticated encryption with integrity verification

### Security Features
1. **Per-Record Encryption**: Each payout request gets unique salt and IV
2. **Authenticated Encryption**: GCM mode prevents tampering with encrypted data
3. **Key Derivation**: PBKDF2 with 200,000 iterations protects against brute-force attacks
4. **No Key Reuse**: Unique IV per encryption prevents pattern analysis

## Data Storage Format

### Encrypted Payout Structure in Firebase
```json
{
  "user_id": "user123",
  "amount": 5000.0,
  "status": "requested",
  "request_date": "2025-10-30T10:04:06.546868",
  "encrypted": {
    "ciphertext": "BASE64_ENCODED_ENCRYPTED_DATA",
    "iv": "BASE64_ENCODED_IV",
    "salt": "BASE64_ENCODED_SALT",
    "tag": "BASE64_ENCODED_AUTH_TAG",
    "kdf": {
      "algorithm": "PBKDF2",
      "hash": "SHA256",
      "iterations": 200000
    }
  }
}
```

### Encrypted Fields
The following sensitive fields are encrypted:
- `bank_name` - Name of the user's bank
- `account_number` - Bank account number
- `account_name` - Name on the bank account

### Unencrypted Fields (Metadata)
These fields remain unencrypted for operational purposes:
- `user_id` - User identifier
- `amount` - Payout amount
- `status` - Payout status (requested, paid)
- `request_date` - Timestamp of request
- `paid_date` - Timestamp when paid (if applicable)

## Environment Configuration

### Required Secret: ENCRYPTION_KEY
The application **requires** an `ENCRYPTION_KEY` environment variable to operate. This key must be:
- **32 bytes** when base64-decoded
- **Stored securely** in Replit Secrets
- **Never committed** to version control
- **Backed up securely** - if lost, encrypted data cannot be recovered

### Generating an Encryption Key
```bash
python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

### Setting the Key in Replit
1. Go to Replit Secrets (lock icon in sidebar)
2. Add a new secret: `ENCRYPTION_KEY`
3. Paste the generated key value
4. Restart the application

## API Behavior

### Encryption Flow (`/register_payout`)
1. User submits payout request with bank details
2. System validates input
3. Bank details are encrypted using AES-256-GCM
4. Encrypted blob is stored in Firebase with metadata
5. Only encrypted ciphertext is persisted

### Decryption Flow (`/get_payouts` - Admin Only)
1. Admin authenticates via session
2. System retrieves all payout records from Firebase
3. For each payout with encrypted data:
   - Extract ciphertext, IV, salt, and tag
   - Derive decryption key using stored KDF parameters
   - Decrypt and verify authentication tag
   - Return decrypted bank details to admin
4. Legacy payouts without encryption are flagged

### Error Handling
- **Encryption failure**: Returns HTTP 500 with generic error
- **Decryption failure**: Returns payout with `decryption_error` flag
- **Missing encryption key**: Application fails to start (fail-fast)

## Security Best Practices

### What We Do
✅ Use industry-standard AES-256-GCM encryption  
✅ Unique salt and IV per encryption operation  
✅ Strong key derivation (PBKDF2, 200k iterations)  
✅ Authenticated encryption prevents tampering  
✅ Fail-fast if encryption key is missing  
✅ Sanitized error logging (no sensitive data in logs)  
✅ Admin-only access to decrypted data  
✅ Backward compatibility for legacy unencrypted payouts  

### What We Don't Do
❌ Store encryption key in code or database  
❌ Reuse IVs or salts across encryptions  
❌ Log decrypted sensitive data  
❌ Allow non-admin access to bank details  
❌ Generate ephemeral encryption keys  

## Backup and Recovery

### Key Management
- **CRITICAL**: The `ENCRYPTION_KEY` must be securely backed up
- If the key is lost, all encrypted payout data becomes permanently unrecoverable
- Recommended: Store key in a secure password manager or secrets vault

### Key Rotation (Future Enhancement)
To implement key rotation:
1. Add `ENCRYPTION_KEY_NEW` alongside `ENCRYPTION_KEY`
2. Decrypt existing payouts with old key
3. Re-encrypt with new key
4. Update all records
5. Remove old key after migration

## Compliance and Audit

### Audit Trail
All payout operations are logged in the audit trail:
- Payout request: `register_payout` action
- Payout approval: `mark_payout_paid` action
- Includes: timestamp, user_id, amount, payout_id

### Data Access
- Bank details are **only** decrypted for admin viewing
- Users cannot retrieve their own encrypted bank details via API
- All admin actions are logged in the audit trail

## Testing Encryption

### Verify Encryption is Active
```bash
# 1. Create a payout
curl -X POST http://localhost:5000/register_payout \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test123","amount":1000,"bank_name":"Test Bank","account_number":"1234567890","account_name":"Test User"}'

# 2. Check Firebase directly - you should see encrypted blob
curl https://your-firebase-url.firebaseio.com/payouts.json

# 3. Admin login and decrypt
curl -X POST http://localhost:5000/admin_login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

curl http://localhost:5000/get_payouts -b cookies.txt
# Should show decrypted bank details
```

### Expected Results
- Firebase storage: Only base64-encoded ciphertext visible
- Admin API: Decrypted plaintext bank details returned
- Logs: No sensitive data in application logs

## Migration from Unencrypted Payouts

The system supports **backward compatibility** for legacy payouts created before encryption:

### Legacy Payout Handling
- Payouts without `encrypted` field are treated as legacy
- Returned with `legacy_unencrypted: true` flag
- Bank details shown as stored (plaintext from old system)
- Admin can identify which payouts need migration

### Migration Strategy (Optional)
1. Export all legacy payouts via `/get_payouts`
2. For each legacy payout:
   - Re-encrypt bank details
   - Update Firebase record with encrypted blob
   - Remove plaintext bank fields
3. Mark as migrated

## Threat Model

### Protected Against
✅ Database breach - encrypted data unreadable without key  
✅ Insider threats - bank details encrypted at rest  
✅ Data tampering - GCM authentication tag verification  
✅ Rainbow table attacks - unique salts per record  

### Not Protected Against (Out of Scope)
❌ Compromised encryption key - protect key like root password  
❌ Application-level attacks while data is decrypted in memory  
❌ Admin account compromise - secure admin credentials separately  

## Conclusion

Lonaat's payout encryption system provides **enterprise-grade protection** for sensitive banking information using industry-standard cryptographic practices. The system is designed to be secure by default while maintaining operational flexibility for administrators.

**Remember**: The `ENCRYPTION_KEY` is the single point of trust - protect it accordingly.
