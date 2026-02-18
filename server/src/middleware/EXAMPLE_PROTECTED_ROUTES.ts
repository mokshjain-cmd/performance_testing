/**
 * Example: Protected Routes Implementation
 * 
 * This file demonstrates how to implement role-based access control
 * on various routes using the auth middleware.
 */

import { Router } from 'express';
import { verifyUserRole, requireAdmin, requireRole } from '../middleware';

const router = Router();

// ============================================
// EXAMPLE 1: Admin-only endpoint
// ============================================
router.get('/admin/stats', 
  verifyUserRole,    // Step 1: Verify user exists and get role
  requireAdmin,      // Step 2: Ensure user is admin
  (req, res) => {
    // Only admins reach here
    res.json({
      message: 'Admin stats',
      user: req.user?.name,
      role: req.userRole
    });
  }
);

// ============================================
// EXAMPLE 2: Tester-only endpoint
// ============================================
router.post('/tests/submit', 
  verifyUserRole,
  requireRole('tester'),
  (req, res) => {
    // Only testers reach here
    res.json({ message: 'Test submitted' });
  }
);

// ============================================
// EXAMPLE 3: Multiple roles allowed
// ============================================
router.get('/sessions/list', 
  verifyUserRole,
  requireRole(['admin', 'tester']),  // Both roles allowed
  (req, res) => {
    // Both admins and testers reach here
    res.json({ sessions: [] });
  }
);

// ============================================
// EXAMPLE 4: Different actions based on role
// ============================================
router.delete('/sessions/:sessionId', 
  verifyUserRole,
  (req, res) => {
    // Custom logic based on role
    if (req.userRole === 'admin') {
      // Admins can delete any session
      res.json({ message: 'Session deleted by admin' });
    } else if (req.userRole === 'tester') {
      // Testers can only delete their own sessions
      // Add additional check here
      res.json({ message: 'Session deleted by tester' });
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  }
);

// ============================================
// EXAMPLE 5: Public endpoint (no auth)
// ============================================
router.get('/health', (req, res) => {
  // Anyone can access
  res.json({ status: 'ok' });
});

// ============================================
// EXAMPLE 6: Optional authentication
// ============================================
router.get('/sessions/:id', (req, res) => {
  // Try to get userId from query, but don't require it
  const userId = req.query.userId;
  
  if (userId) {
    // If userId provided, we could verify role
    // But for this example, we just acknowledge it
    res.json({ 
      message: 'Session details',
      authenticatedView: true 
    });
  } else {
    // Public view
    res.json({ 
      message: 'Session details',
      authenticatedView: false 
    });
  }
});

// ============================================
// PRACTICAL EXAMPLE: Admin Dashboard Routes
// ============================================

// GET /api/admin/dashboard - Admin only
router.get('/admin/dashboard', 
  verifyUserRole, 
  requireAdmin, 
  (req, res) => {
    res.json({
      totalUsers: 100,
      totalSessions: 500,
      activeTests: 25
    });
  }
);

// DELETE /api/admin/users/:userId - Admin only
router.delete('/admin/users/:userId', 
  verifyUserRole, 
  requireAdmin, 
  (req, res) => {
    res.json({ 
      message: `User ${req.params.userId} deleted by ${req.user?.name}` 
    });
  }
);

// ============================================
// PRACTICAL EXAMPLE: Session Management
// ============================================

// POST /api/sessions/create - Both roles can create
router.post('/sessions/create', 
  verifyUserRole,
  requireRole(['admin', 'tester']),
  (req, res) => {
    res.json({ 
      message: 'Session created',
      createdBy: req.user?.name,
      role: req.userRole
    });
  }
);

// DELETE /api/sessions/:id - Only admin can delete
router.delete('/sessions/:id', 
  verifyUserRole,
  requireAdmin,
  (req, res) => {
    res.json({ 
      message: `Session ${req.params.id} deleted`
    });
  }
);

export default router;
