import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { compoundRoutes } from '../modules/compounds/compound.routes.js';
import { unitRoutes } from '../modules/units/unit.routes.js';
import { residentRoutes } from '../modules/residents/resident.routes.js';
import { complaintRoutes } from '../modules/complaints/complaint.routes.js';

const router = Router();

// Mount Health Check endpoint
router.use('/health', healthRoutes);

// Mount domain routes (placeholders)
router.use('/compounds', compoundRoutes);
router.use('/units', unitRoutes);
router.use('/residents', residentRoutes);
router.use('/complaints', complaintRoutes);

export const apiRoutes = router;
