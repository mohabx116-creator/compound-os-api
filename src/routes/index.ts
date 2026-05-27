import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { compoundRoutes } from '../modules/compounds/compound.routes.js';
import { unitRoutes } from '../modules/units/unit.routes.js';
import { residentRoutes } from '../modules/residents/resident.routes.js';
import { complaintRoutes } from '../modules/complaints/complaint.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { serviceCategoryRoutes } from '../modules/service-categories/service-category.routes.js';
import { serviceProviderRoutes } from '../modules/service-providers/service-provider.routes.js';

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Mount domain routes (placeholders)
router.use('/compounds', compoundRoutes);
router.use('/units', unitRoutes);
router.use('/residents', residentRoutes);
router.use('/complaints', complaintRoutes);

// Mount Service Directory routes (B1A — read-only)
router.use('/service-categories', serviceCategoryRoutes);
router.use('/service-providers', serviceProviderRoutes);

export const apiRoutes = router;
