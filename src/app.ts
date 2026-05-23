import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { notFoundMiddleware } from './common/middlewares/not-found.middleware.js';
import { errorMiddleware } from './common/middlewares/error.middleware.js';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming request JSON and URL-encoded bodies with limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging under development environment
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount all versioned API routes
app.use('/api/v1', apiRoutes);

// Catch 404 and forward to error handler
app.use(notFoundMiddleware);

// Central error handler middleware
app.use(errorMiddleware);

export default app;
