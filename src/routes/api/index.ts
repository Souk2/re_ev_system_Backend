import { Router } from 'express';
import { createDynamicRoutes } from './dynamicRoutes';
import { createUploadRoutes } from './uploadRoutes';
import { createTeacherAssignmentRoutes } from './teacherAssignmentRoutes';
import { createApplicationRoutes } from './applicationRoutes';
import { createEnrollmentRoutes } from './enrollmentRoutes';
import scheduleRoutes from './scheduleRoutes';

const router = Router();

// ✅ Removed global auth to allow public access for Web Application Form
// (Provinces, Districts, Departments, and Application Submission)

// ⚠️ IMPORTANT: Custom routes must come BEFORE dynamic routes
// so they catch the requests first for tables with composite keys
router.use('/schedule', scheduleRoutes);
router.use(createApplicationRoutes());
router.use(createTeacherAssignmentRoutes());
router.use(createEnrollmentRoutes());
router.use(createDynamicRoutes());
router.use(createUploadRoutes());

// API Root
router.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    documentation: 'Use /:resource (e.g., /departments, /courses) to access CRUD endpoints',
    availableResources: Object.keys(require('../../config/tables').tableConfigs)
  });
});

export default router;
