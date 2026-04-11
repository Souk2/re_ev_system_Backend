import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from 'dotenv';

config();

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import apiRouter from './routes/api';

const app: Application = express();

// ✅ Dynamic CORS from .env
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',')
  : ['http://localhost:1420'];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl or Postman) or if in allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));
app.use(morgan('dev'));

// Increase JSON payload limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory with CORS and proper MIME types
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(uploadsPath, {
  fallthrough: false,
  setHeaders: (res, filePath) => {
    // Set proper content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    if (mimeTypes[ext]) {
      res.header('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Debug endpoint to check uploads
app.get('/api/debug/uploads', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const staffDir = path.join(uploadsDir, 'staff');
    const teacherDir = path.join(uploadsDir, 'teachers');
    
    const staffFiles = fs.existsSync(staffDir) ? fs.readdirSync(staffDir) : [];
    const teacherFiles = fs.existsSync(teacherDir) ? fs.readdirSync(teacherDir) : [];
    
    res.json({
      success: true,
      uploadsDir,
      staffDir,
      teacherDir,
      staffFiles,
      teacherFiles,
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Re_Ev_System Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'ບໍ່ພົບໜ້າທີ່ຕ້ອງການ',
    message: `ບໍ່ພົບເສັ້ນທາງ ${req.method} ${req.path}`
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('ຂໍ້ຜິດພາດ:', err);
  res.status(500).json({
    error: 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ',
    message: process.env.NODE_ENV === 'development' ? err.message : 'ມີບາງຢ່າງຜິດພາດ'
  });
});

export default app;
