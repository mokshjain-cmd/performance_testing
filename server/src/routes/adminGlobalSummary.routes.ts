import { Router } from 'express';
import { getAdminGlobalSummary } from '../controllers/adminGlobalSummary.controller';

// Uncomment the following line to enable role-based access control
// import { verifyUserRole, requireAdmin } from '../middleware';

const router = Router();

// GET global summary
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps (defaults to HR)
// Add verifyUserRole and requireAdmin middleware to restrict access:
// router.get('/', verifyUserRole, requireAdmin, getAdminGlobalSummary);
router.get('/', getAdminGlobalSummary);

export default router;
