import { Router } from 'express';
import { PublicStatsController } from './public-stats.controller.js';

export const publicStatsRoutes = Router();

publicStatsRoutes.get('/', PublicStatsController.getStats);
