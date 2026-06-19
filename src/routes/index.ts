import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { compoundRoutes } from '../modules/compounds/compound.routes.js';
import { unitRoutes } from '../modules/units/unit.routes.js';
import { residentRoutes } from '../modules/residents/resident.routes.js';
import { complaintRoutes } from '../modules/complaints/complaint.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { requireAdminRole, requireAuth } from '../modules/auth/auth.middleware.js';
import { serviceCategoryRoutes } from '../modules/service-categories/service-category.routes.js';
import { serviceProviderRoutes } from '../modules/service-providers/service-provider.routes.js';
import { servicesRoutes } from '../modules/services/services.routes.js';
import { rentalRoutes } from '../modules/rentals/rental.routes.js';
import { adminNotificationRoutes } from '../modules/admin-notifications/admin-notification.routes.js';
import { adminDashboardRoutes } from '../modules/admin-dashboard/admin-dashboard.routes.js';
import { adminSettingsRoutes } from '../modules/admin-settings/admin-settings.routes.js';

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Mount domain routes (placeholders)
router.use('/compounds', requireAuth, compoundRoutes);
router.use('/units', requireAuth, unitRoutes);
router.use('/residents', requireAuth, residentRoutes);
router.use('/complaints', requireAuth, complaintRoutes);

// Mount Service Directory routes (B1A — read-only)
router.use('/service-categories', serviceCategoryRoutes);
router.use('/service-providers', serviceProviderRoutes);
router.use('/services', servicesRoutes);
router.use('/rentals', rentalRoutes);

router.use('/admin/notifications', requireAuth, requireAdminRole, adminNotificationRoutes);
router.use('/admin/dashboard', requireAuth, requireAdminRole, adminDashboardRoutes);
router.use('/admin/settings', requireAuth, requireAdminRole, adminSettingsRoutes);

export const apiRoutes = router;
