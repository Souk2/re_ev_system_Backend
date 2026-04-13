import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../../config/database'
import { sendApprovalEmail } from '../../services/EmailService'
import { authenticate } from '../../middleware/auth'
import path from 'path'
import fs from 'fs'

export const createApplicationRoutes = () => {
  const router = Router()

  router.put('/student_applications/:id/approve', authenticate, async (req: any, res: Response) => {
    const { id } = req.params
    const { review_notes } = req.body
    const authUserId = req.user?.userId

    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Get staff_id from user_id
      const staffResult = await client.query(
        'SELECT id FROM staff WHERE user_id = $1',
        [authUserId]
      )

      if (staffResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(403).json({ error: 'Forbidden: Staff record not found' })
      }

      const staffId = staffResult.rows[0].id

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
        'UPDATE student_applications SET status = $1, review_notes = $2, reviewed_by = $3, updated_at = NOW() WHERE id = $4',
        ['approved', review_notes || '', staffId, id]
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
        `INSERT INTO students (user_id, student_code, department_id, session_id, entry_year_id, current_year_level, status, created_at, updated_at)
         SELECT $1, $2, $3, $4, ay.id, 1, 'active', NOW(), NOW()
         FROM academic_years ay
         WHERE ay.is_current = true
         LIMIT 1
         RETURNING id`,
        [userId, studentCode, app.applied_department_id || null, app.session_id || null]
      )

      const studentId = studentResult.rows[0]?.id

      // Move photo from applications to students directory with student code name
      let newPhotoPath = app.photo_3x4_path
      if (app.photo_3x4_path) {
        const oldFullPath = path.join(process.cwd(), app.photo_3x4_path)
        
        if (fs.existsSync(oldFullPath)) {
          const ext = path.extname(app.photo_3x4_path)
          const newFilename = `${studentCode}${ext}`
          const studentDir = path.join(process.cwd(), 'uploads', 'students')
          const newFullPath = path.join(studentDir, newFilename)

          try {
            // Ensure students directory exists
            if (!fs.existsSync(studentDir)) {
              fs.mkdirSync(studentDir, { recursive: true })
            }

            // Copy file to new location
            fs.copyFileSync(oldFullPath, newFullPath)
            
            // Delete old file
            fs.unlinkSync(oldFullPath)

            newPhotoPath = `uploads/students/${newFilename}`
            console.log(`✅ Moved photo during approval: ${app.photo_3x4_path} -> ${newPhotoPath}`)
          } catch (err) {
            console.error(`❌ Failed to move photo: ${app.photo_3x4_path}`, err)
            // If move fails, keep the original path
            newPhotoPath = app.photo_3x4_path
          }
        }
      }

      await client.query(
        `INSERT INTO student_profiles (
          student_id, first_name_lo, last_name_lo, first_name_en, last_name_en,
          gender, dob, ethnicity_id, religion_id, birth_province_id,
          birth_district_id, birth_village, phone, email, reg_province_id, reg_district_id,
          reg_village, residence_type_id, res_province_id, res_district_id,
          res_village, photo_path, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())`,
        [
          studentId,
          app.first_name_lo, app.last_name_lo, app.first_name_en, app.last_name_en,
          app.gender, app.dob, app.ethnicity_id, app.religion_id, app.birth_province_id,
          app.birth_district_id, app.birth_village, app.phone, app.email, app.reg_province_id, app.reg_district_id,
          app.reg_village, app.residence_type_id, app.res_province_id, app.res_district_id,
          app.res_village, newPhotoPath
        ]
      )

      if (app.emergency_contacts && app.emergency_contacts.length > 0) {
        for (const contact of app.emergency_contacts) {
          await client.query(
            `INSERT INTO student_emergency_contacts (
              student_id, full_name, relationship_id, province_id, district_id,
              village, phone_home, phone_office, phone_mobile, is_primary,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              studentId,
              contact.full_name,
              contact.relationship_id || null,
              contact.province_id || null,
              contact.district_id || null,
              contact.village || null,
              contact.phone_home || null,
              contact.phone_office || null,
              contact.phone_mobile,
              contact.is_primary !== undefined ? contact.is_primary : false
            ]
          )
        }
      }

      if (app.education_records && app.education_records.length > 0) {
        for (const edu of app.education_records) {
          await client.query(
            `INSERT INTO student_education_records (
              student_id, record_type, school_name, graduation_year,
              school_province_id, school_district_id,
              institution_name, department_name, current_year_level,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              studentId,
              edu.record_type,
              edu.school_name || null,
              edu.graduation_year ? parseInt(edu.graduation_year) || null : null,
              edu.school_province_id || null,
              edu.school_district_id || null,
              edu.institution_name || null,
              edu.department_name || null,
              edu.current_year_level ? parseInt(edu.current_year_level) || null : null
            ]
          )
        }
      }

      if (app.work_affiliations && app.work_affiliations.length > 0) {
        for (const work of app.work_affiliations) {
          await client.query(
            `INSERT INTO student_work_affiliations (
              student_id, occupation, position, workplace_name,
              department, province_or_ministry, is_active,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              studentId,
              work.occupation || null,
              work.position || null,
              work.workplace_name || null,
              work.department || null,
              work.province_or_ministry || null,
              work.is_active !== undefined ? work.is_active : true
            ]
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

  router.put('/student_applications/:id/reject', authenticate, async (req: any, res: Response) => {
    const { id } = req.params
    const { review_notes } = req.body
    const authUserId = req.user?.userId

    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' })
    }

    // Get staff_id from user_id
    const staffResult = await pool.query(
      'SELECT id FROM staff WHERE user_id = $1',
      [authUserId]
    )

    if (staffResult.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Staff record not found' })
    }

    const staffId = staffResult.rows[0].id

    try {
      const result = await pool.query(
        'UPDATE student_applications SET status = $1, review_notes = $2, reviewed_by = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        ['rejected', review_notes || '', staffId, id]
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

  router.delete('/student_applications/:id', async (req: Request, res: Response) => {
    const { id } = req.params

    try {
      const result = await pool.query(
        'DELETE FROM student_applications WHERE id = $1 RETURNING *',
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' })
      }

      res.json({
        success: true,
        message: 'Deleted successfully',
        data: result.rows[0]
      })

    } catch (error: any) {
      console.error('Delete Error:', error)
      res.status(500).json({
        error: 'Failed to delete application',
        details: error.message
      })
    }
  })

  return router
}
