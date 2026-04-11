import { Router } from 'express';
import {
  generateSchedule,
  getScheduleSummary,
  detectConflicts,
  getScheduleClasses,
  deleteSchedule
} from '../../controllers/scheduleController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// All schedule routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/schedule/generate
 * @desc    Generate automatic class schedule
 * @access  Admin, Staff only
 * @body    academicYearId, semester, departmentId?, yearLevel?, dryRun?
 */
router.post('/generate', authorize('admin', 'staff'), generateSchedule);

/**
 * @route   GET /api/schedule/summary
 * @desc    Get schedule summary for a semester
 * @access  Admin, Staff, Teacher
 * @query   academicYearId, semester, departmentId?
 */
router.get('/summary', getScheduleSummary);

/**
 * @route   GET /api/schedule/conflicts
 * @desc    Detect schedule conflicts
 * @access  Admin, Staff
 * @query   academicYearId, semester
 */
router.get('/conflicts', authorize('admin', 'staff'), detectConflicts);

/**
 * @route   GET /api/schedule/classes
 * @desc    Get all classes for a schedule
 * @access  Admin, Staff, Teacher, Student
 * @query   academicYearId, semester, departmentId?, yearLevel?
 */
router.get('/classes', getScheduleClasses);

/**
 * @route   DELETE /api/schedule/delete
 * @desc    Delete all classes for a semester (reset schedule)
 * @access  Admin only
 * @body    academicYearId, semester
 */
router.delete('/delete', authorize('admin'), deleteSchedule);

export default router;
