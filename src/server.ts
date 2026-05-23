import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.PORT, () => {
  console.log('🚀 Compound OS API Server starting...');
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 Port:        ${env.PORT}`);
  console.log(`🔗 Health:      http://localhost:${env.PORT}/api/v1/health`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('🛑 Express server closed.');

    try {
      await prisma.$disconnect();
      console.log('🔌 Prisma client disconnected successfully.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error disconnecting Prisma client during shutdown:', error);
      process.exit(1);
    }
  });

  // Enforce termination if graceful shutdown is non-responsive
  setTimeout(() => {
    console.error('🚨 Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
