# Admin Routes Guard Setup Guide

This document demonstrates how to implement role-based access control in Express routes using the provided middleware.

## Available Middleware Functions

- **`adminOnly`**: Checks if user has admin privileges
- **`adminOnlyRoute`**: Checks admin status AND account suspension  
- **`roleGuard(roles)`**: Accepts array of allowed roles
- **`ownsResource(paramName)`**: Allows admins to access any resource, users only their own
- **`notSuspended()`**: Checks if user account is active

## Examples

### Example 1: Simple Admin-Only Route

```typescript
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/roleGuard';

const router = Router();

router.get(
  '/admin/users',
  authMiddleware,
  adminOnly,
  (req: AuthRequest, res: Response) => {
    // Only admins can reach this code
    res.json({ message: 'Admin access granted' });
  }
);
```

### Example 2: Admin Route with Suspended Account Check

```typescript
router.post(
  '/admin/settings/update',
  authMiddleware,
  adminOnlyRoute, // Checks admin AND not suspended
  (req: AuthRequest, res: Response) => {
    res.json({ message: 'Admin settings updated' });
  }
);
```

### Example 3: Role-Based Access with Multiple Roles

```typescript
router.patch(
  '/admin/approvals',
  authMiddleware,
  roleGuard(['ADMIN', 'MODERATOR']),
  (req: AuthRequest, res: Response) => {
    res.json({ message: 'Approval processed' });
  }
);
```

### Example 4: Ownership Check (Users Access Own Data)

```typescript
// Combine admin access OR own resource ownership
router.get(
  '/admin/withdrawals/:userId',
  authMiddleware,
  ownsResource('userId'), // Admin can access all, user can access own
  (req: AuthRequest, res: Response) => {
    const userId = req.params.userId;
    res.json({ message: `Withdrawals for user ${userId}` });
  }
);
```

### Example 5: Admin Dashboard Route

```typescript
router.get(
  '/admin/dashboard',
  authMiddleware,
  adminOnly,
  (req: AuthRequest, res: Response) => {
    // Analytics and platform stats
    res.json({
      totalUsers: 1000,
      activeUsers: 750,
      totalRevenue: 50000,
      pendingApprovals: 23
    });
  }
);
```

### Example 6: Update User (Admin Only)

```typescript
router.patch(
  '/admin/users/:userId',
  authMiddleware,
  adminOnly,
  (req: AuthRequest, res: Response) => {
    const userId = req.params.userId;
    // Update user (suspend, modify commission, etc.)
    res.json({ message: `User ${userId} updated` });
  }
);
```

### Example 7: Approve Withdrawal (Admin Only)

```typescript
router.post(
  '/admin/withdrawals/:id/approve',
  authMiddleware,
  adminOnly,
  (req: AuthRequest, res: Response) => {
    const withdrawalId = req.params.id;
    // Approve withdrawal
    res.json({ message: `Withdrawal ${withdrawalId} approved` });
  }
);
```

### Example 8: Adjust Commission (Admin Only)

```typescript
router.patch(
  '/admin/commissions/:userId',
  authMiddleware,
  adminOnly,
  (req: AuthRequest, res: Response) => {
    const userId = req.params.userId;
    const { commission } = req.body;
    // Update commission rate
    res.json({ message: `Commission for user ${userId} updated to ${commission}%` });
  }
);
```

## Usage in Actual Route Files

In your actual route file (e.g., `src/routes/admin.ts`):

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminOnly } from '../middleware/roleGuard';

const adminRouter = Router();

// All routes under adminRouter will be protected
adminRouter.use(authMiddleware);
adminRouter.use(adminOnly);

// Now all routes are admin-only by default
adminRouter.get('/users', getUsersHandler);
adminRouter.post('/users/:id/suspend', suspendUserHandler);

export default adminRouter;
```

## Middleware Composition

You can combine multiple middleware for fine-grained control:

```typescript
// Require admin + account active
router.post('/sensitive', authMiddleware, adminOnlyRoute, handler);

// Allow admin OR content moderator
router.patch('/content/:id', authMiddleware, roleGuard(['ADMIN', 'MODERATOR']), handler);

// Allow admin accessing any resource, users accessing own
router.get('/data/:userId', authMiddleware, ownsResource('userId'), handler);
```

## Authentication Flow

1. **`authMiddleware`** (required first) - Verifies JWT token and populates `req.user`
2. **Role Guards** (optional) - Check permissions via `req.user.role` or `req.user.isAdmin`
3. **Route Handler** - Only reached if all middleware passes

If any middleware rejects, a 401/403 response is returned and handler is skipped.
