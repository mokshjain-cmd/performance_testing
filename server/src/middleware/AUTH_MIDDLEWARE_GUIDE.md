# Auth Middleware Usage Guide

## Overview
This middleware provides role-based access control by verifying user roles and restricting access to specific endpoints.

## Available Middleware

### 1. `verifyUserRole`
Extracts userId from request (body/params/query), fetches user from database, and attaches user info to `req.user` and `req.userRole`.

### 2. `requireRole(roles)`
Factory function to restrict access to specific roles.

### 3. `requireAdmin`
Shorthand to require admin role.

### 4. `requireTester`
Shorthand to require tester role.

## Usage Examples

### Basic Usage - Verify User Role
```typescript
import { verifyUserRole } from '../middleware/auth.middleware';

// This will attach req.user and req.userRole to the request
router.get('/profile', verifyUserRole, (req, res) => {
  res.json({
    user: req.user,
    role: req.userRole
  });
});
```

### Restrict to Admin Only
```typescript
import { verifyUserRole, requireAdmin } from '../middleware/auth.middleware';

// Only admins can access this endpoint
router.get('/admin/stats', verifyUserRole, requireAdmin, getAdminStats);
```

### Restrict to Specific Roles
```typescript
import { verifyUserRole, requireRole } from '../middleware/auth.middleware';

// Allow both admin and tester
router.post('/sessions/create', 
  verifyUserRole, 
  requireRole(['admin', 'tester']), 
  createSession
);

// Only admin
router.delete('/sessions/:id', 
  verifyUserRole, 
  requireRole('admin'), 
  deleteSession
);
```

### Multiple Middleware Chain
```typescript
import { verifyUserRole, requireAdmin } from '../middleware';

router.delete('/admin/purge-data', 
  verifyUserRole,      // Step 1: Verify user exists and attach role
  requireAdmin,         // Step 2: Check if role is admin
  purgeData            // Step 3: Execute controller
);
```

## Request Object Extensions

After `verifyUserRole` middleware:
- `req.user`: Full user object (IUser)
- `req.userRole`: User's role ('admin' | 'tester')

## Example Implementation

### Admin-only Dashboard Route
```typescript
// routes/admin.routes.ts
import { Router } from 'express';
import { verifyUserRole, requireAdmin } from '../middleware';
import { getDashboard, deleteUser } from '../controllers/admin.controller';

const router = Router();

router.get('/dashboard', verifyUserRole, requireAdmin, getDashboard);
router.delete('/users/:id', verifyUserRole, requireAdmin, deleteUser);

export default router;
```

### Mixed Access Route
```typescript
// routes/session.routes.ts
import { Router } from 'express';
import { verifyUserRole, requireRole } from '../middleware';
import { createSession, deleteSession } from '../controllers/session.controller';

const router = Router();

// Both admin and tester can create sessions
router.post('/create', 
  verifyUserRole, 
  requireRole(['admin', 'tester']), 
  createSession
);

// Only admin can delete sessions
router.delete('/:id', 
  verifyUserRole, 
  requireRole('admin'), 
  deleteSession
);

export default router;
```

## Controller Access

Inside your controller, you can access:

```typescript
export const someController = async (req: Request, res: Response) => {
  // Access user info
  const userId = req.user?._id;
  const userName = req.user?.name;
  const userEmail = req.user?.email;
  const userRole = req.userRole;

  // Your logic here
  if (userRole === 'admin') {
    // Admin-specific logic
  }

  res.json({ success: true });
};
```

## Error Responses

### No User ID Provided (400)
```json
{
  "success": false,
  "message": "User ID is required"
}
```

### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Role Not Verified (401)
```json
{
  "success": false,
  "message": "User role not verified. Please use verifyUserRole middleware first."
}
```

### Access Denied (403)
```json
{
  "success": false,
  "message": "Access denied. Required role: admin. Your role: tester"
}
```

## Notes

- Always use `verifyUserRole` before `requireRole`, `requireAdmin`, or `requireTester`
- userId can be in `req.body`, `req.params`, or `req.query`
- The middleware automatically handles error responses
- TypeScript types are extended to include `req.user` and `req.userRole`
