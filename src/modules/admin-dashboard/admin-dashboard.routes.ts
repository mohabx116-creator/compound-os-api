import { Router } from 'express';
import { AdminDashboardController } from './admin-dashboard.controller.js';

const router = Router();

/**
 * GET /api/v1/admin/dashboard/summary
 *
 * Auth: requireAuth + requireAdminRole (applied in routes/index.ts)
 *
 * Returns an aggregated summary of all operational data for the admin dashboard:
 * rentals, services, complaints, residents/units, notifications, and recent activity lists.
 *
 * Privacy: nationalId is never selected. Compound-scoped by req.auth.compoundId.
 */
router.get('/summary', AdminDashboardController.getDashboardSummary);

export const adminDashboardRoutes = router;
