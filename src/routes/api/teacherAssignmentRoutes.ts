import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';

export const createTeacherAssignmentRoutes = () => {
  const router = Router();

  // ==================== TEACHER QUALIFICATIONS ====================

  // GET all teacher qualifications
  router.get('/teacher_qualifications', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT tq.teacher_id, tq.course_id,
          t.first_name || ' ' || t.last_name as teacher_name,
          c.code as course_code, c.name as course_name
        FROM teacher_qualifications tq
        INNER JOIN teachers t ON tq.teacher_id = t.id
        INNER JOIN courses c ON tq.course_id = c.id
        ORDER BY t.first_name, c.code
      `);
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('❌ Get qualifications error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST create teacher qualification
  router.post('/teacher_qualifications', async (req: Request, res: Response) => {
    try {
      const { teacher_id, course_id } = req.body;
      
      if (!teacher_id || !course_id) {
        return res.status(400).json({ success: false, error: 'ຂໍ້ມູນບໍ່ຄົບຖ້ວນ' });
      }

      const result = await pool.query(
        'INSERT INTO teacher_qualifications (teacher_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [teacher_id, course_id]
      );

      if (result.rowCount === 0) {
        return res.status(409).json({ success: false, error: 'ມີຂໍ້ມູນນີ້ຢູ່ແລ້ວ' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('❌ Create qualification error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete teacher qualification (composite key: teacher_id, course_id)
  router.delete('/teacher_qualifications/:teacher_id/:course_id', async (req: Request, res: Response) => {
    try {
      const { teacher_id, course_id } = req.params;
      
      const result = await pool.query(
        'DELETE FROM teacher_qualifications WHERE teacher_id = $1 AND course_id = $2',
        [teacher_id, course_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'ບໍ່ພົບຂໍ້ມູນ' });
      }

      res.json({ success: true, message: 'ລຶບວຸດທິການສຳເລັດ' });
    } catch (error: any) {
      console.error('❌ Delete qualification error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== TEACHER AVAILABILITY ====================

  // GET all teacher availability
  router.get('/teacher_availability', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT ta.teacher_id, ta.session_id, ta.day_of_week, ta.year_level,
          t.first_name || ' ' || t.last_name as teacher_name,
          s.name_lo as session_name,
          s.name_en as session_name_en,
          s.time_start as session_time_start,
          s.time_end as session_time_end
        FROM teacher_availability ta
        INNER JOIN teachers t ON ta.teacher_id = t.id
        INNER JOIN sessions s ON ta.session_id = s.id
        ORDER BY t.first_name, ta.day_of_week, s.time_start, ta.year_level
      `);
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('❌ Get availability error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST create teacher availability
  router.post('/teacher_availability', async (req: Request, res: Response) => {
    try {
      const { teacher_id, session_id, day_of_week, year_level } = req.body;

      if (!teacher_id || !session_id || !day_of_week || !year_level) {
        return res.status(400).json({ success: false, error: 'ຂໍ້ມູນບໍ່ຄົບຖ້ວນ' });
      }

      const result = await pool.query(
        'INSERT INTO teacher_availability (teacher_id, session_id, day_of_week, year_level) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *',
        [teacher_id, session_id, day_of_week, parseInt(year_level)]
      );

      if (result.rowCount === 0) {
        return res.status(409).json({ success: false, error: 'ມີຂໍ້ມູນນີ້ຢູ່ແລ້ວ' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('❌ Create availability error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete teacher availability (composite key: teacher_id, session_id, day_of_week, year_level)
  router.delete('/teacher_availability/:teacher_id/:session_id/:day_of_week/:year_level', async (req: Request, res: Response) => {
    try {
      const { teacher_id, session_id, day_of_week, year_level } = req.params;

      const result = await pool.query(
        'DELETE FROM teacher_availability WHERE teacher_id = $1 AND session_id = $2 AND day_of_week = $3 AND year_level = $4',
        [teacher_id, session_id, day_of_week, parseInt(year_level)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'ບໍ່ພົບຂໍ້ມູນ' });
      }

      res.json({ success: true, message: 'ລຶບຄວາມພ້ອມສຳເລັດ' });
    } catch (error: any) {
      console.error('❌ Delete availability error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== DAYS OF WEEK ====================

  // GET days of week (static data)
  router.get('/days_of_week', async (req: Request, res: Response) => {
    try {
      const days = [
        { value: 'monday', label_lo: 'ຈັນ', label_en: 'Monday' },
        { value: 'tuesday', label_lo: 'ອັງຄານ', label_en: 'Tuesday' },
        { value: 'wednesday', label_lo: 'ພຸດ', label_en: 'Wednesday' },
        { value: 'thursday', label_lo: 'ພະຫັດ', label_en: 'Thursday' },
        { value: 'friday', label_lo: 'ສຸກ', label_en: 'Friday' }
      ];
      res.json({ success: true, data: days });
    } catch (error: any) {
      console.error('❌ Get days of week error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
