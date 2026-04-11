import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../../config/database'
import { sendApprovalEmail } from '../../services/EmailService'

export const createApplicationRoutes = () => {
  const router = Router()

  router.put('/student_applications/:id/approve', async (req: Request, res: Response) => {
    const { id } = req.params
    const { review_notes } = req.body
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const appResult = await client.query(
        'SELECT * FROM student_applications WHERE id = $1',
        [id]
      )

      if (appResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Not found' })
      }

      const app = appResult.rows[0]

      await client.query(
        'UPDATE student_applications SET status = $1, review_notes = $2, updated_at = NOW() WHERE id = $3',
        ['approved', review_notes || '', id]
      )

      const studentCodeResult = await client.query('SELECT fn_generate_student_code() as student_code')
      const studentCode = studentCodeResult.rows[0].student_code

      const hashedPassword = await bcrypt.hash(studentCode, 10)

      const userResult = await client.query(
        `INSERT INTO users (username, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, 'student', true, NOW(), NOW())
         RETURNING id`,
        [studentCode, hashedPassword]
      )

      const userId = userResult.rows[0].id

      const studentResult = await client.query(
        `INSERT INTO students (user_id, student_code, department_id, entry_year_id, current_year_level, status, created_at, updated_at)
         SELECT $1, $2, $3, ay.id, 1, 'active', NOW(), NOW()
         FROM academic_years ay
         WHERE ay.is_current = true
         LIMIT 1
         RETURNING id`,
        [userId, studentCode, app.applied_department_id || null]
      )

      const studentId = studentResult.rows[0]?.id

      await client.query(
        `INSERT INTO student_profiles (
          student_id, first_name_lo, last_name_lo, first_name_en, last_name_en,
          gender, dob, ethnicity_id, religion_id, birth_province_id,
          birth_district_id, birth_village, phone, reg_province_id, reg_district_id,
          reg_village, residence_type_id, res_province_id, res_district_id,
          res_village, photo_path, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())`,
        [
          studentId,
          app.first_name_lo, app.last_name_lo, app.first_name_en, app.last_name_en,
          app.gender, app.dob, app.ethnicity_id, app.religion_id, app.birth_province_id,
          app.birth_district_id, app.birth_village, app.phone, app.reg_province_id, app.reg_district_id,
          app.reg_village, app.residence_type_id, app.res_province_id, app.res_district_id,
          app.res_village, app.photo_3x4_path
        ]
      )

      if (app.emergency_contacts && app.emergency_contacts.length > 0) {
        for (const contact of app.emergency_contacts) {
          await client.query(
            `INSERT INTO student_emergency_contacts (student_id, full_name, phone_mobile, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [studentId, contact.full_name, contact.phone_mobile]
          )
        }
      }

      if (app.education_records && app.education_records.length > 0) {
        for (const edu of app.education_records) {
          await client.query(
            `INSERT INTO student_education_records (
              student_id, record_type, school_name, graduation_year, institution_name,
              department_name, current_year_level, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              studentId, 
              edu.record_type, 
              edu.school_name, 
              edu.graduation_year ? parseInt(edu.graduation_year) || null : null,
              edu.institution_name, 
              edu.department_name, 
              edu.current_year_level ? parseInt(edu.current_year_level) || null : null
            ]
          )
        }
      }

      if (app.work_affiliations && app.work_affiliations.length > 0) {
        for (const work of app.work_affiliations) {
          await client.query(
            `INSERT INTO student_work_affiliations (
              student_id, occupation, position, workplace_name, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [studentId, work.occupation, work.position, work.workplace_name, work.is_active !== false]
          )
        }
      }

      await client.query('COMMIT')

      const deptResult = await pool.query(
        'SELECT name FROM departments WHERE id = $1',
        [app.applied_department_id]
      )
      const departmentName = deptResult.rows[0]?.name || 'ທົ່ວໄປ'
      const approvalDate = new Date().toLocaleString('lo-LA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      try {
        await sendApprovalEmail(app.email, `${app.first_name_lo} ${app.last_name_lo}`, studentCode, studentCode, departmentName, approvalDate)
        console.log(`Email sent to: ${app.email}`)
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
      }

      res.json({
        success: true,
        message: 'Approved successfully',
        data: {
          user_id: userId,
          student_id: studentId,
          username: studentCode,
          email_sent: true
        }
      })

    } catch (error: any) {
      await client.query('ROLLBACK')
      console.error('Approval Error:', error)
      res.status(500).json({
        error: 'Failed to approve',
        details: error.message
      })
    } finally {
      client.release()
    }
  })

  router.put('/student_applications/:id/reject', async (req: Request, res: Response) => {
    const { id } = req.params
    const { review_notes } = req.body

    try {
      const result = await pool.query(
        'UPDATE student_applications SET status = $1, review_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        ['rejected', review_notes || '', id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' })
      }

      res.json({
        success: true,
        message: 'Rejected successfully',
        data: result.rows[0]
      })

    } catch (error: any) {
      console.error('Rejection Error:', error)
      res.status(500).json({
        error: 'Failed to reject',
        details: error.message
      })
    }
  })

  return router
}
