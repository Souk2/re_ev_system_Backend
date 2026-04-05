import app from './app';
import { config } from 'dotenv';
import { pool } from './config/database';

// Load environment variables
config();

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:1420'}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} signal received: shutting down gracefully`);

  server.close(async () => {
    console.log('✅ HTTP server closed');

    try {
      // ປິດ database connections
      await pool.end();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error closing database connections:', error);
    } finally {
      process.exit(0);
    }
  });

  // ຖ້າ shutdown ໃຊ້ເວລາຫຼາຍກວ່າ 10 ວິນາທີ, ບັງຄັບປິດ
  setTimeout(() => {
    console.log('⚠️  Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ຈັດການ uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default server;
