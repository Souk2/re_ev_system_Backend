import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';

export const createEnrollmentRoutes = () => {
  const router = Router();

  // ─── ADMIN: Section Assignment ──────────────────────────────────────────────

  router.get('/admin/students-unassigned', async (req: Request, res: Response) => {
    const { department_id, entry_year_id } = req.query;
    try {
      let query = `
        SELECT s.id, s.student_code, s.current_year_level, s.section_code, s.status,
          COALESCE(sp.first_name_lo || ' ' || sp.last_name_lo, s.student_code) AS full_name,
          d.name as department_name, d.id as department_id,
          ay.name as entry_year_name, ay.id as entry_year_id
        FROM students s
        LEFT JOIN student_profiles sp ON s.id = sp.student_id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN academic_years ay ON s.entry_year_id = ay.id
        WHERE s.status = 'active'
      `;
      const values: any[] = [];
      let param = 1;
      if (department_id) { query += ` AND s.department_id = $${param++}`; values.push(department_id); }
      if (entry_year_id) { query += ` AND s.entry_year_id = $${param++}`; values.push(entry_year_id); }
      query += ` ORDER BY d.name, COALESCE(s.section_code, 'ZZZ'), sp.last_name_lo, sp.first_name_lo`;
      const result = await pool.query(query, values);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.post('/admin/assign-sections', async (req: Request, res: Response) => {
    const { department_id, entry_year_id, mode, assignments } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (mode === 'manual' && assignments) {
        for (const a of assignments) {
          if (a.section_code !== undefined) {
            await client.query(
              'UPDATE students SET section_code = $1, updated_at = NOW() WHERE id = $2',
              [a.section_code ? a.section_code.toUpperCase() : null, a.student_id]
            );
          }
        }
        await client.query('COMMIT');
        return res.json({ success: true, message: 'ບັນທຶກຫ້ອງຮຽນສຳເລັດ' });
      }

      // Auto: balanced distribution for unassigned
      const studentsRes = await client.query(
        `SELECT id FROM students
         WHERE department_id = $1 AND entry_year_id = $2 AND section_code IS NULL AND status = 'active'
         ORDER BY id`,
        [department_id, entry_year_id]
      );
      const students = studentsRes.rows;
      const n = students.length;
      if (n === 0) {
        await client.query('ROLLBACK');
        return res.json({ success: true, message: 'ບໍ່ມີນັກສຶກສາທີ່ຍັງບໍ່ໄດ້ຮັບການຈັດຫ້ອງ' });
      }

      const MAX_PER_SECTION = 35;
      const sectionsNeeded = Math.ceil(n / MAX_PER_SECTION);
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const baseSize = Math.floor(n / sectionsNeeded);
      const remainder = n % sectionsNeeded;
      let idx = 0;
      for (let i = 0; i < sectionsNeeded; i++) {
        const size = baseSize + (i < remainder ? 1 : 0);
        for (let j = 0; j < size; j++) {
          await client.query(
            'UPDATE students SET section_code = $1, updated_at = NOW() WHERE id = $2',
            [letters[i], students[idx++].id]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `ຈັດຫ້ອງສຳເລັດ`, data: { sections_created: sectionsNeeded, students_assigned: n } });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, error: (error as Error).message });
    } finally {
      client.release();
    }
  });

  // ─── STUDENT: Enrollment Info ───────────────────────────────────────────────

  router.get('/student/enrollment-info', async (req: Request, res: Response) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
      const studentRes = await pool.query(
        `SELECT s.*, d.name as department_name, d.code as department_code
         FROM students s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = $1`,
        [student_id]
      );
      if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
      const student = studentRes.rows[0];

      const yearRes = await pool.query('SELECT id, name FROM academic_years WHERE is_current = true LIMIT 1');
      const currentYear = yearRes.rows[0] || null;
      if (!currentYear) return res.json({ success: true, data: { student, enrollment_status: 'no_academic_year', classes: [], tuition_fees: [] } });

      // Already enrolled this year?
      const existingRes = await pool.query(
        'SELECT id FROM invoices WHERE student_id = $1 AND academic_year_id = $2 LIMIT 1',
        [student_id, currentYear.id]
      );
      const alreadyEnrolled = existingRes.rows.length > 0;

      // Has previous year invoices (returning student)?
      const previousRes = await pool.query(
        'SELECT id FROM invoices WHERE student_id = $1 AND academic_year_id != $2 LIMIT 1',
        [student_id, currentYear.id]
      );
      const isReturning = previousRes.rows.length > 0;

      // Year level to display (after potential advancement)
      const displayYearLevel =
        isReturning && !alreadyEnrolled && student.current_year_level < 3
          ? student.current_year_level + 1
          : student.current_year_level;

      const feesRes = await pool.query(
        `SELECT tf.id, tf.semester, tf.fee_amount, tf.is_active
         FROM tuition_fees tf
         WHERE tf.department_id = $1 AND tf.academic_year_id = $2 AND tf.year_level = $3 AND tf.is_active = true
         ORDER BY tf.semester`,
        [student.department_id, currentYear.id, displayYearLevel]
      );

      // Always fetch all courses for the year level (based on course code pattern).
      // LEFT JOIN classes to get schedule info for this section (if assigned).
      const classesRes = await pool.query(
        `SELECT
          c.id AS id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          c.year_level,
          CASE
            WHEN RIGHT(c.code, 2) = '01' THEN 1
            WHEN RIGHT(c.code, 2) = '02' THEN 2
            ELSE 1
          END AS semester,
          cl.id AS class_id,
          cl.section_code,
          cl.room,
          cl.day_of_week,
          t.first_name || ' ' || t.last_name AS teacher_name,
          ts.time_start,
          ts.time_end,
          s.name_lo AS session_name
         FROM courses c
         LEFT JOIN classes cl
           ON cl.course_id = c.id
           AND cl.academic_year_id = $1
           AND cl.year_level = $2
           AND cl.section_code = $3
           AND cl.time_slot_id IN (
             SELECT id FROM time_slots WHERE session_id = $5
           )
         LEFT JOIN teachers t ON cl.teacher_id = t.id
         LEFT JOIN time_slots ts ON cl.time_slot_id = ts.id
         LEFT JOIN sessions s ON ts.session_id = s.id
         WHERE c.department_id = $4
           AND c.year_level = $2
         ORDER BY semester, c.code`,
        [currentYear.id, displayYearLevel, student.section_code || null, student.department_id, student.session_id]
      );
      const classes = classesRes.rows;

      let currentEnrollments: any[] = [];
      if (alreadyEnrolled) {
        const enrollRes = await pool.query(
          `SELECT e.id, e.status, c.code as course_code, c.name as course_name,
                  c.credits, cl.semester, cl.section_code, cl.year_level,
                  t.first_name || ' ' || t.last_name as teacher_name
           FROM enrollments e
           JOIN classes cl ON e.class_id = cl.id
           JOIN courses c ON cl.course_id = c.id
           JOIN invoices i ON e.invoice_id = i.id
           LEFT JOIN teachers t ON cl.teacher_id = t.id
           WHERE e.student_id = $1 AND i.academic_year_id = $2
           ORDER BY cl.semester, c.code`,
          [student_id, currentYear.id]
        );
        currentEnrollments = enrollRes.rows;
      }

      res.json({
        success: true,
        data: {
          student,
          academic_year: currentYear,
          tuition_fees: feesRes.rows,
          classes,
          enrollment_status: alreadyEnrolled ? 'enrolled' : 'not_enrolled',
          is_returning: isReturning,
          display_year_level: displayYearLevel,
          current_enrollments: currentEnrollments
        }
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
    }
  });

  // ─── STUDENT: Enroll ────────────────────────────────────────────────────────

  router.post('/student/enroll', async (req: Request, res: Response) => {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentRes = await client.query(
        `SELECT s.*, d.name as department_name FROM students s
         LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = $1`,
        [student_id]
      );
      if (studentRes.rows.length === 0) throw new Error('Student not found');
      const student = studentRes.rows[0];

      if (!student.section_code) throw new Error('ນັກສຶກສາຍັງບໍ່ໄດ້ຮັບການຈັດຫ້ອງ ກະລຸນາຕິດຕໍ່ Admin');

      const yearRes = await client.query('SELECT id, name FROM academic_years WHERE is_current = true LIMIT 1');
      if (yearRes.rows.length === 0) throw new Error('ບໍ່ມີສົກຮຽນປັດຈຸບັນ');
      const currentYear = yearRes.rows[0];

      const existingRes = await client.query(
        'SELECT id FROM invoices WHERE student_id = $1 AND academic_year_id = $2 LIMIT 1',
        [student_id, currentYear.id]
      );
      if (existingRes.rows.length > 0) throw new Error('ນັກສຶກສາໄດ້ລົງທະບຽນໃນສົກຮຽນນີ້ແລ້ວ');

      const previousRes = await client.query(
        'SELECT id FROM invoices WHERE student_id = $1 AND academic_year_id != $2 LIMIT 1',
        [student_id, currentYear.id]
      );
      const isReturning = previousRes.rows.length > 0;

      let newYearLevel = student.current_year_level;
      if (isReturning && student.current_year_level < 3) {
        newYearLevel = student.current_year_level + 1;
        await client.query(
          'UPDATE students SET current_year_level = $1, updated_at = NOW() WHERE id = $2',
          [newYearLevel, student_id]
        );
      }

      const feesRes = await client.query(
        `SELECT tf.* FROM tuition_fees tf
         WHERE tf.department_id = $1 AND tf.academic_year_id = $2 AND tf.year_level = $3 AND tf.is_active = true
         ORDER BY tf.semester`,
        [student.department_id, currentYear.id, newYearLevel]
      );
      if (feesRes.rows.length === 0) throw new Error('ບໍ່ມີຂໍ້ມູນຄ່າຮຽນ ກະລຸນາຕັ້ງຄ່າຮຽນໃນລະບົບ');

      const classesRes = await client.query(
        `SELECT cl.id, cl.semester FROM classes cl
         JOIN time_slots ts ON cl.time_slot_id = ts.id
         WHERE cl.academic_year_id = $1 AND cl.year_level = $2 AND cl.section_code = $3
           AND ts.session_id = $4`,
        [currentYear.id, newYearLevel, student.section_code, student.session_id]
      );
      if (classesRes.rows.length === 0)
        throw new Error(`ບໍ່ມີລາຍວິຊາສຳລັບຫ້ອງ ${student.section_code} ປີ ${newYearLevel} ພາກ ${student.session_id} ໃນສົກຮຽນນີ້`);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceMap: Record<number, string> = {};
      for (const fee of feesRes.rows) {
        const invRes = await client.query(
          `INSERT INTO invoices (student_id, tuition_fee_id, academic_year_id, year_level, semester,
           total_amount, due_date, late_fee_per_day, is_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
           ON CONFLICT (student_id, academic_year_id, semester) DO NOTHING RETURNING id`,
          [student_id, fee.id, currentYear.id, newYearLevel, fee.semester, fee.fee_amount, dueDate, 20000]
        );
        if (invRes.rows.length > 0) invoiceMap[fee.semester] = invRes.rows[0].id;
      }

      let enrolled = 0;
      for (const cls of classesRes.rows) {
        const invoiceId = invoiceMap[cls.semester];
        if (!invoiceId) continue;
        await client.query(
          `INSERT INTO enrollments (student_id, class_id, invoice_id, status)
           VALUES ($1, $2, $3, 'pending_payment') ON CONFLICT (student_id, class_id) DO NOTHING`,
          [student_id, cls.id, invoiceId]
        );
        enrolled++;
      }

      await client.query('COMMIT');

      const msg = isReturning
        ? `ລົງທະບຽນສຳເລັດ! ເລື່ອນຊັ້ນຈາກ ປີ ${student.current_year_level}${student.section_code} → ປີ ${newYearLevel}${student.section_code}`
        : `ລົງທະບຽນສຳເລັດສຳລັບ ປີ ${newYearLevel}${student.section_code}!`;

      res.status(201).json({
        success: true,
        message: msg,
        data: {
          student_id,
          new_year_level: newYearLevel,
          section_code: student.section_code,
          is_year_advanced: isReturning && newYearLevel > student.current_year_level,
          classes_enrolled: enrolled,
          academic_year: currentYear.name
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Enrollment error:', error);
      res.status(500).json({ error: (error as Error).message });
    } finally {
      client.release();
    }
  });

  // ─── STUDENT: Enrollment History ────────────────────────────────────────────

  router.get('/student/enrollment-history', async (req: Request, res: Response) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
      const result = await pool.query(
        `SELECT e.id as enrollment_id, e.status, e.created_at as enrolled_at,
                c.code as course_code, c.name as course_name, c.credits,
                cl.semester, cl.section_code, cl.year_level,
                ay.name as academic_year,
                i.total_amount, i.is_paid, i.due_date, i.paid_at, i.late_fee_per_day,
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
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
    }
  });

  // ─── STUDENT: Payment / Invoices ────────────────────────────────────────────

  router.get('/student/my-invoices', async (req: Request, res: Response) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });
    try {
      const result = await pool.query(
        `SELECT i.id, i.semester, i.total_amount, i.due_date, i.is_paid, i.paid_at,
                i.year_level, i.late_fee_per_day, i.academic_year_id,
                ay.name as academic_year_name,
                CASE
                  WHEN i.is_paid = false AND i.due_date < CURRENT_DATE
                  THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date)::INTEGER * i.late_fee_per_day
                  ELSE 0
                END as late_fee,
                p.id as payment_id, p.status as payment_status, p.amount_paid, p.payment_method
         FROM invoices i
         JOIN academic_years ay ON i.academic_year_id = ay.id
         LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'approved'
         WHERE i.student_id = $1
         ORDER BY ay.name DESC, i.year_level, i.semester`,
        [student_id]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.post('/student/pay-invoice', async (req: Request, res: Response) => {
    const { invoice_id, student_id, payment_method = 'cash' } = req.body;
    if (!invoice_id || !student_id) return res.status(400).json({ error: 'invoice_id and student_id required' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const invRes = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND student_id = $2',
        [invoice_id, student_id]
      );
      if (invRes.rows.length === 0) throw new Error('ບໍ່ພົບໃບແຈ້ງໜີ້');
      const invoice = invRes.rows[0];
      if (invoice.is_paid) throw new Error('ໃບແຈ້ງໜີ້ນີ້ຈ່າຍແລ້ວ');

      const today = new Date();
      const due = new Date(invoice.due_date);
      const diffDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      const lateFee = diffDays * parseFloat(invoice.late_fee_per_day);
      const totalPaid = parseFloat(invoice.total_amount) + lateFee;

      await client.query(
        `INSERT INTO payments (invoice_id, amount_paid, payment_method, status) VALUES ($1, $2, $3, 'approved')`,
        [invoice_id, totalPaid, payment_method]
      );
      await client.query('UPDATE invoices SET is_paid = true, paid_at = NOW(), updated_at = NOW() WHERE id = $1', [invoice_id]);
      await client.query(
        `UPDATE enrollments SET status = 'enrolled', updated_at = NOW()
         WHERE invoice_id = $1 AND status = 'pending_payment'`,
        [invoice_id]
      );
      await client.query('COMMIT');
      res.json({ success: true, message: 'ຈ່າຍເງິນສຳເລັດ', data: { amount_paid: totalPaid } });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, error: (error as Error).message });
    } finally {
      client.release();
    }
  });

  router.post('/student/pay-invoices', async (req: Request, res: Response) => {
    const { invoice_ids, student_id, payment_method = 'cash' } = req.body;
    if (!invoice_ids?.length || !student_id) return res.status(400).json({ error: 'invoice_ids and student_id required' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let totalPaidAll = 0;
      for (const invoice_id of invoice_ids) {
        const invRes = await client.query(
          'SELECT * FROM invoices WHERE id = $1 AND student_id = $2', [invoice_id, student_id]
        );
        if (invRes.rows.length === 0 || invRes.rows[0].is_paid) continue;
        const invoice = invRes.rows[0];
        const today = new Date();
        const due = new Date(invoice.due_date);
        const diffDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        const lateFee = diffDays * parseFloat(invoice.late_fee_per_day);
        const totalPaid = parseFloat(invoice.total_amount) + lateFee;
        await client.query(
          `INSERT INTO payments (invoice_id, amount_paid, payment_method, status) VALUES ($1, $2, $3, 'approved')`,
          [invoice_id, totalPaid, payment_method]
        );
        await client.query('UPDATE invoices SET is_paid = true, paid_at = NOW(), updated_at = NOW() WHERE id = $1', [invoice_id]);
        await client.query(
          `UPDATE enrollments SET status = 'enrolled', updated_at = NOW() WHERE invoice_id = $1 AND status = 'pending_payment'`,
          [invoice_id]
        );
        totalPaidAll += totalPaid;
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'ຈ່າຍເງິນສຳເລັດ', data: { total_paid: totalPaidAll } });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, error: (error as Error).message });
    } finally {
      client.release();
    }
  });

  return router;
};
