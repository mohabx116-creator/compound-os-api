import { Router } from 'express';
import { AuthController } from './auth.controller.js';

const router = Router();

router.get('/status', AuthController.getStatus);

export const authRoutes = router;
