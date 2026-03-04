# 🚨 Backend Contract Verification - ACTION ITEMS

**Date**: March 1, 2026  
**Status**: 🔴 **FOUNDATION LOCKED WITH 5 CRITICAL GAPS**

---

## ✋ STOP: Do NOT add features until these are implemented

The following 5 endpoints are **CRITICAL BLOCKING ISSUES**:

### 1️⃣ **POST /api/auth/refresh** 
**Impact**: Token refresh will fail → Users get logged out when token expires

**Current State**: ❌ Endpoint does not exist

**Fix Required**:
```typescript
// File: backend-node/src/routes/auth.ts
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = auth.substring(7);
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const newToken = generateToken({ 
      id: payload.id, 
      role: payload.role, 
      email: payload.email, 
      name: payload.name 
    });

    res.json({ access_token: newToken, token: newToken });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Frontend Expects**: 
```javascript
// From: frontend/src/services/api.js:46
const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
  headers: { Authorization: `Bearer ${refreshToken}` }
});
// Uses: data.access_token
```

**Estimated Time**: 15 minutes

---

### 2️⃣ **POST /api/auth/send-verification**
**Impact**: Users cannot verify email addresses during registration

**Current State**: ❌ Endpoint does not exist

**Fix Required**:
```typescript
// File: backend-node/src/routes/auth.ts
router.post('/send-verification', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { id: user.id, email: user.email, type: 'verification' },
      process.env.JWT_SECRET || '',
      { expiresIn: '24h' }
    );

    // TODO: Send email with verification link
    // const verificationUrl = `${BASE_URL}/verify-email?token=${verificationToken}`;
    // await sendVerificationEmail(user.email, verificationUrl);

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('Send verification error:', err);
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
});
```

**Frontend Expects**:
```javascript
// From: frontend/src/services/api.js:96
sendVerification: () => api.post('/auth/send-verification'),
```

**Estimated Time**: 20 minutes

---

### 3️⃣ **POST /api/auth/verify-email**
**Impact**: Users cannot confirm email verification during signup

**Current State**: ❌ Endpoint does not exist

**Fix Required**:
```typescript
// File: backend-node/src/routes/auth.ts
router.post('/verify-email', async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== 'verification') {
      return res.status(401).json({ error: 'Invalid or expired verification token' });
    }

    const user = await prisma.user.update({
      where: { id: Number(payload.id) },
      data: { is_verified: true }
    });

    res.json({ message: 'Email verified successfully', user });
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Failed to verify email' });
  }
});
```

**Frontend Expects**:
```javascript
// From: frontend/src/pages/auth/VerifyEmail.jsx:23
const { data } = await authAPI.verifyEmail(token);
// Expects: data.message
```

**Estimated Time**: 15 minutes

---

### 4️⃣ **POST /api/auth/request-password-reset**
**Impact**: Users cannot request password reset → Account lockout

**Current State**: ❌ Endpoint does not exist

**Fix Required**:
```typescript
// File: backend-node/src/routes/auth.ts
router.post('/request-password-reset', async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists - security best practice
      return res.json({ message: 'If account exists, reset link will be sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: 'password_reset' },
      process.env.JWT_SECRET || '',
      { expiresIn: '1h' }
    );

    // TODO: Send reset email
    // const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
    // await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: 'Password reset email sent if account exists' });
  } catch (err) {
    console.error('Request reset error:', err);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});
```

**Frontend Expects**:
```javascript
// From: frontend/src/pages/auth/ResetPassword.jsx:24
await authAPI.requestPasswordReset(email);
// Toast: "Password reset email sent! Check your inbox."
```

**Estimated Time**: 20 minutes

---

### 5️⃣ **POST /api/auth/reset-password**
**Impact**: Password reset tokens are useless → Cannot reset passwords

**Current State**: ❌ Endpoint does not exist

**Fix Required**:
```typescript
// File: backend-node/src/routes/auth.ts
router.post('/reset-password', async (req: express.Request, res: express.Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== 'password_reset') {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: Number(payload.id) },
      data: { password: hash }
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});
```

**Frontend Expects**:
```javascript
// From: frontend/src/pages/auth/ResetPassword.jsx:48
await authAPI.resetPassword(token, formData.password);
// Toast: "Password reset successful!"
```

**Estimated Time**: 15 minutes

---

## 🔴 BLOCKING CHECKLIST

Before frontend can be tested:

```
[ ] Implement POST /api/auth/refresh (15 min)
[ ] Implement POST /api/auth/send-verification (20 min)
[ ] Implement POST /api/auth/verify-email (15 min)
[ ] Implement POST /api/auth/request-password-reset (20 min)
[ ] Implement POST /api/auth/reset-password (15 min)
[ ] Test all 5 endpoints
[ ] Verify frontend-backend integration
[ ] Update frontend .env with API_URL if needed
```

**Total Time**: ~1.5 hours for all 5 endpoints

---

## 🟡 SECONDARY FIXES (After critical gaps)

### Notification HTTP Method Mismatch

**Issue**: Frontend sends `PATCH /api/notifications/:id/read` but backend expects `PUT`

**Current Route** (backend-node/src/routes/users.ts:255):
```typescript
router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  // ...
});
```

**Frontend Sends** (frontend/src/pages/user/Notifications.jsx:27):
```javascript
await api.patch(`/notifications/${id}/read`);
```

**Fix Option 1** (Recommended - Change to PATCH):
```typescript
// Change route definition from .put to .patch
router.patch('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  // Same implementation
});
```

**OR Fix Option 2** (Support both):
```typescript
router.patch('/notifications/:id/read', authMiddleware, handler);
router.put('/notifications/:id/read', authMiddleware, handler); // Keep for compatibility
```

---

### Missing Notification Endpoints

1. **POST /api/notifications/mark-all-read**
```typescript
router.post('/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: req.user!.id },
      data: { is_read: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});
```

2. **DELETE /api/notifications/:id**
```typescript
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: parseInt(req.params.id), user_id: req.user!.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});
```

---

## ✅ POST-FIX VERIFICATION

Once implemented, test with:

```bash
# 1. Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# 2. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 3. Refresh Token
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Authorization: Bearer {TOKEN}"

# 4. Send Verification
curl -X POST http://localhost:4000/api/auth/send-verification \
  -H "Authorization: Bearer {TOKEN}"

# 5. Verify Email
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{ "token": "{VERIFICATION_TOKEN}" }'

# 6. Request Password Reset
curl -X POST http://localhost:4000/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com" }'

# 7. Reset Password
curl -X POST http://localhost:4000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "{RESET_TOKEN}",
    "password": "newpassword123"
  }'
```

---

## 📊 Summary

| Task | Time | Priority | Status |
|------|------|----------|--------|
| Implement auth refresh | 15 min | P0 | 🔴 TODO |
| Implement send verification | 20 min | P0 | 🔴 TODO |
| Implement verify email | 15 min | P0 | 🔴 TODO |
| Implement password reset request | 20 min | P0 | 🔴 TODO |
| Implement password reset confirm | 15 min | P0 | 🔴 TODO |
| Fix notification PATCH method | 10 min | P1 | 🔴 TODO |
| Implement mark-all-read | 10 min | P1 | 🔴 TODO |
| Implement delete notification | 10 min | P1 | 🔴 TODO |
| **Total** | **~2 hours** | **All** | **🔴** |

---

## 🎯 Next Steps

1. **NOW**: Implement the 5 critical auth endpoints
2. **THEN**: Fix the 3 notification issues
3. **FINALLY**: Proceed with feature development with full confidence

**DO NOT SKIP** - These gaps will cause major issues in production.

---

**Verification Complete**: March 1, 2026  
**Foundation Status**: 🔴 **LOCKED - WAITING FOR AUTH FIXES**

