import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';

export const createEnrollmentRoutes = () => {
  const router = Router();

  // GET: Get student enrollment info (available classes for enrollment)
  router.get('/api/student/enrollment-info', async (req: Request, res: Response) => {
    const { student_id } = req.query;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    try {
      // Get student details
      const studentRes = await pool.query(
        `SELECT s.*, d.name as department_name, d.code as department_code
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.id = $1`,
        [student_id]
      );

      if (studentRes.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = studentRes.rows[0];

      // Get current academic year
      const yearRes = await pool.query(
        'SELECT id, name FROM academic_years WHERE is_current = true LIMIT 1'
      );

      // Get tuition fees for this student's department and year level
      const feesRes = await pool.query(
        `SELECT tf.id, tf.semester, tf.fee_amount, tf.is_active
         FROM tuition_fees tf
         WHERE tf.department_id = $1 
           AND tf.academic_year_id = $2
           AND tf.year_level = $3
           AND tf.is_active = true`,
        [student.department_id, yearRes.rows[0]?.id, student.current_year_level]
      );

      // Get available courses for this year level
      const coursesRes = await pool.query(
        `SELECT c.id, c.code, c.name, c.credits, c.year_level
         FROM courses c
         WHERE c.department_id = $1
           AND c.year_level = $2
         ORDER BY c.code`,
        [student.department_id, student.current_year_level]
      );

      // Get classes for these courses (both semesters)
      const classesRes = await pool.query(
        `SELECT cl.id, cl.course_id, cl.semester, cl.section_code, 
                cl.year_level, cl.room, c.code as course_code, 
                c.name as course_name, c.credits,
                t.first_name || ' ' || t.last_name as teacher_name,
                s.name_lo as session_name,
                ts.time_start, ts.time_end
         FROM classes cl
         JOIN courses c ON cl.course_id = c.id
         LEFT JOIN teachers t ON cl.teacher_id = t.id
         LEFT JOIN time_slots ts ON cl.time_slot_id = ts.id
         LEFT JOIN sessions s ON ts.session_id = s.id
         WHERE cl.academic_year_id = $1
           AND cl.year_level = $2
           AND c.department_id = $3
         ORDER BY cl.semester, c.code`,
        [yearRes.rows[0]?.id, student.current_year_level, student.department_id]
      );

      // Get available sessions
      const sessionsRes = await pool.query(
        'SELECT id, code, name_lo, name_en, time_start, time_end FROM sessions WHERE is_active = true'
      );

      res.json({
        success: true,
        data: {
          student,
          academic_year: yearRes.rows[0] || null,
          tuition_fees: feesRes.rows,
          courses: coursesRes.rows,
          classes: classesRes.rows,
          sessions: sessionsRes.rows
        }
      });
    } catch (error) {
      console.error('❌ Error getting enrollment info:', error);
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
    }
  });

  // POST: Enroll in classes for semester
  router.post('/api/student/enroll', async (req: Request, res: Response) => {
    const {
      student_id,
      session_id,
      class_ids,
      semester
    } = req.body;

    if (!student_id || !class_ids || class_ids.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get student info
      const studentRes = await client.query(
        'SELECT * FROM students WHERE id = $1',
        [student_id]
      );
      const student = studentRes.rows[0];

      // Get current academic year
      const yearRes = await client.query(
        'SELECT id, name FROM academic_years WHERE is_current = true LIMIT 1'
      );
      
      if (yearRes.rows.length === 0) {
        throw new Error('No current academic year configured');
      }

      const academic_year_id = yearRes.rows[0].id;

      // Get tuition fees for both semesters
      const feesRes = await client.query(
        `SELECT tf.* FROM tuition_fees tf
         WHERE tf.department_id = $1 
           AND tf.academic_year_id = $2
           AND tf.year_level = $3
           AND tf.is_active = true
         ORDER BY tf.semester`,
        [student.department_id, academic_year_id, student.current_year_level]
      );

      if (feesRes.rows.length === 0) {
        throw new Error('No tuition fees configured for this year level');
      }

      const totalAmount = feesRes.rows.reduce((sum: number, fee: any) => sum + parseFloat(fee.fee_amount), 0);
      
      // Due date: 30 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoices for both semesters
      const invoices: any[] = [];
      for (const fee of feesRes.rows) {
        const invoiceRes = await client.query(
          `INSERT INTO invoices (student_id, tuition_fee_id, academic_year_id, year_level, semester, 
           total_amount, due_date, late_fee_per_day, is_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            student_id,
            fee.id,
            academic_year_id,
            student.current_year_level,
            fee.semester,
            fee.fee_amount,
            dueDate,
            20000, // Late fee per day
            false
          ]
        );
        invoices.push(invoiceRes.rows[0]);
      }

      // Create enrollments for selected classes
      const enrollments: any[] = [];
      for (let i = 0; i < class_ids.length; i++) {
        const classId = class_ids[i];
        const invoiceId = invoices[i % invoices.length].id;

        const enrollRes = await client.query(
          `INSERT INTO enrollments (student_id, class_id, invoice_id, status)
           VALUES ($1, $2, $3, 'pending_payment')
           RETURNING *`,
          [student_id, classId, invoiceId]
        );
        enrollments.push(enrollRes.rows[0]);
      }

      // Get full enrollment details
      const enrollmentDetailsRes = await client.query(
        `SELECT e.id, e.status, c.code as course_code, c.name as course_name, 
                c.credits, cl.semester, cl.section_code, cl.year_level,
                t.first_name || ' ' || t.last_name as teacher_name
         FROM enrollments e
         JOIN classes cl ON e.class_id = cl.id
         JOIN courses c ON cl.course_id = c.id
         LEFT JOIN teachers t ON cl.teacher_id = t.id
         WHERE e.student_id = $1
         ORDER BY cl.semester, c.code`,
        [student_id]
      );

      await client.query('COMMIT');

      // Return enrollment receipt
      res.status(201).json({
        success: true,
        message: 'Enrollment successful',
        data: {
          student,
          academic_year_id,
          session_id,
          semester,
          enrolled_classes: enrollmentDetailsRes.rows,
          invoices,
          total_amount: totalAmount,
          due_date: dueDate,
          late_fee_per_day: 20000
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error enrolling student:', error);
      res.status(500).json({ error: 'Enrollment failed', details: (error as Error).message });
    } finally {
      client.release();
    }
  });

  // GET: Get student's enrollment history
  router.get('/api/student/enrollment-history', async (req: Request, res: Response) => {
    const { student_id } = req.query;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    try {
      const historyRes = await pool.query(
        `SELECT e.id as enrollment_id, e.status, e.created_at as enrolled_at,
                c.code as course_code, c.name as course_name, c.credits,
                cl.semester, cl.section_code, cl.year_level,
                ay.name as academic_year,
                i.total_amount, i.is_paid, i.due_date, i.paid_at,
                i.late_fee_per_day,
                CASE 
                  WHEN i.is_paid = false AND i.due_date < CURRENT_DATE 
                  THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date)::INTEGER * i.late_fee_per_day
                  ELSE 0
                END as late_fee,
                t.first_name || ' ' || t.last_name as teacher_name,
                s.name_lo as session_name
         FROM enrollments e
         JOIN classes cl ON e.class_id = cl.id
         JOIN courses c ON cl.course_id = c.id
         JOIN invoices i ON e.invoice_id = i.id
         JOIN academic_years ay ON i.academic_year_id = ay.id
         LEFT JOIN teachers t ON cl.teacher_id = t.id
         LEFT JOIN time_slots ts ON cl.time_slot_id = ts.id
         LEFT JOIN sessions s ON ts.session_id = s.id
         WHERE e.student_id = $1
         ORDER BY ay.name DESC, cl.semester, c.code`,
        [student_id]
      );

      res.json({
        success: true,
        data: historyRes.rows
      });
    } catch (error) {
      console.error('❌ Error getting enrollment history:', error);
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
    }
  });

  return router;
};
