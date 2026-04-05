import { Router, Request, Response } from 'express';
import studentRouter from './students';
import courseRouter from './courses';
import assessmentRouter from './assessments';

const router = Router();

// API routes
router.use('/students', studentRouter);
router.use('/courses', courseRouter);
router.use('/assessments', assessmentRouter);

// API root
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API is running',
    endpoints: {
      students: '/api/students',
      courses: '/api/courses',
      assessments: '/api/assessments'
    }
  });
});

export default router;
