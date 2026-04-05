import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';

config();

import healthRouter from './routes/health';
import authRouter from './routes/auth';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:1420',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);

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
