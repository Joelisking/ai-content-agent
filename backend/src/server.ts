import path from 'path';
import dotenv from 'dotenv';
// Load environment variables BEFORE other imports
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  },
);

// Connect to MongoDB and start server
let server: any;

const startServer = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/ai-content-agent';

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    server.on('listening', () => {
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(
        `📊 Health check at http://localhost:${PORT}/health`,
      );
      console.log(`\n🤖 AI Content Agent System Ready`);
      console.log(`   - Content Generation: Active`);
      console.log(`   - Approval Workflow: Enabled`);
      console.log(`   - Posting Scheduler: Running`);
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.log('Address in use, retrying...');
        setTimeout(() => {
          server.close();
          server.listen(PORT);
        }, 1000);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(
    `\n⚠️  Received ${signal}. Shutting down gracefully...`,
  );

  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('✅ HTTP server closed');
        resolve();
      });
    });
  }

  try {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (err) {
    console.error('Error closing database connection:', err);
  }

  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

startServer();
