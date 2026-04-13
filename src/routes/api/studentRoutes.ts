import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

export const createStudentRoutes = () => {
  const router = Router();

  // Helper to save base64 photo (replaces old photo and uses student code)
  const saveBase64Photo = async (base64Data: string, studentId: string, client?: any): Promise<string> => {
    const studentDir = path.join(process.cwd(), 'uploads', 'students');
    if (!fs.existsSync(studentDir)) {
      fs.mkdirSync(studentDir, { recursive: true });
    }

    // Get student_code to use as filename
    let studentCode = studentId; // fallback
    try {
      const queryClient = client || pool;
      const result = await queryClient.query(
        'SELECT student_code FROM students WHERE id = $1',
        [studentId]
      );
      if (result.rows.length > 0) {
        studentCode = result.rows[0].student_code;
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch student code, using student ID as fallback');
    }

    // Get existing photo path to delete it
    let existingPhotoPath = null;
    try {
      const queryClient = client || pool;
      const photoResult = await queryClient.query(
        'SELECT photo_path FROM student_profiles WHERE student_id = $1',
        [studentId]
      );
      existingPhotoPath = photoResult.rows[0]?.photo_path;
    } catch (err) {
      // Table might not exist yet, ignore
    }

    // Delete old photo file
    if (existingPhotoPath) {
      const oldFullPath = path.join(process.cwd(), existingPhotoPath);
      if (fs.existsSync(oldFullPath)) {
        try {
          fs.unlinkSync(oldFullPath);
          console.log(`✅ Deleted old photo during update: ${existingPhotoPath}`);
        } catch (err) {
          console.error(`⚠️ Failed to delete old photo: ${existingPhotoPath}`, err);
        }
      }
    }

    // Save new photo with student code name
    const pureBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(pureBase64, 'base64');
    
    // Determine file extension from base64 data
    const mimeType = base64Data.match(/data:(image\/\w+);base64/);
    const ext = mimeType ? 
      (mimeType[1].includes('png') ? '.png' : mimeType[1].includes('gif') ? '.gif' : '.jpg') 
      : '.jpg';
    
    const filename = `${studentCode}${ext}`;
    const filepath = path.join(studentDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    const photoPath = `uploads/students/${filename}`;
    console.log(`✅ Saved new photo during update: ${photoPath}`);
    
    return photoPath;
  };

  // Get student with full profile data
  router.get('/students-full', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT s.id as student_id, s.user_id, s.student_code, s.department_id, s.session_id,
               s.entry_year_id, s.current_year_level, s.status, s.created_at, s.updated_at,
               sp.id as profile_id, sp.first_name_lo, sp.last_name_lo, sp.first_name_en, sp.last_name_en,
               sp.gender, sp.dob, sp.ethnicity_id, sp.religion_id, sp.birth_province_id,
               sp.birth_district_id, sp.birth_village, sp.phone, sp.email,
               sp.reg_province_id, sp.reg_district_id, sp.reg_village,
               sp.residence_type_id, sp.res_province_id, sp.res_district_id, sp.res_village,
               sp.photo_path, sp.created_at as profile_created_at, sp.updated_at as profile_updated_at,
               u.username, u.is_active as user_is_active,
               d.name as department_name
        FROM students s
        LEFT JOIN student_profiles sp ON s.id = sp.student_id
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.created_at DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('Get Students Full Error:', error);
      res.status(500).json({ error: 'Failed to fetch students', details: error.message });
    } finally {
      client.release();
    }
  });

  // Get student education records
  router.get('/student-education/:studentId', async (req: Request, res: Response) => {
    const { studentId } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM student_education_records WHERE student_id = $1 ORDER BY created_at',
        [studentId]
      );
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch education records', details: error.message });
    }
  });

  // Get student emergency contacts
  router.get('/student-emergency-contacts/:studentId', async (req: Request, res: Response) => {
    const { studentId } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM student_emergency_contacts WHERE student_id = $1 ORDER BY is_primary DESC, created_at',
        [studentId]
      );
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch emergency contacts', details: error.message });
    }
  });

  // Get student work affiliations
  router.get('/student-work-affiliations/:studentId', async (req: Request, res: Response) => {
    const { studentId } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM student_work_affiliations WHERE student_id = $1',
        [studentId]
      );
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch work affiliations', details: error.message });
    }
  });

  // Create student with all related data
  router.post('/students-full', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        user, student, profile, educationRecords, emergencyContacts, workAffiliations
      } = req.body;

      // 1. Generate student code automatically
      const codeResult = await client.query('SELECT fn_generate_student_code() as student_code');
      const studentCode = codeResult.rows[0].student_code;

      // 2. Generate random password
      const randomPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6).toUpperCase();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // 3. Create user
      const userResult = await client.query(
        `INSERT INTO users (username, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, 'student', true, NOW(), NOW())
         RETURNING id`,
        [studentCode, hashedPassword]
      );
      const userId = userResult.rows[0].id;

      // 4. Create student
      const studentResult = await client.query(
        `INSERT INTO students (user_id, student_code, department_id, session_id, entry_year_id, current_year_level, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id`,
        [userId, studentCode, student.department_id || null, student.session_id || null, student.entry_year_id || null, student.current_year_level || 1, student.status || 'active']
      );
      const studentId = studentResult.rows[0].id;

      // 3. Create profile
      // Handle photo: if base64, save it; if string path, use it directly
      let finalPhotoPath = profile.photo_path || null;
      if (finalPhotoPath && finalPhotoPath.startsWith('data:')) {
        finalPhotoPath = saveBase64Photo(finalPhotoPath, studentId);
      }

      await client.query(
        `INSERT INTO student_profiles (
          student_id, first_name_lo, last_name_lo, first_name_en, last_name_en,
          gender, dob, ethnicity_id, religion_id, birth_province_id, birth_district_id, birth_village,
          phone, email, reg_province_id, reg_district_id, reg_village,
          residence_type_id, res_province_id, res_district_id, res_village,
          photo_path, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW(),NOW())`,
        [
          studentId, profile.first_name_lo, profile.last_name_lo, profile.first_name_en || null, profile.last_name_en || null,
          profile.gender, profile.dob, profile.ethnicity_id || null, profile.religion_id || null, profile.birth_province_id || null, profile.birth_district_id || null, profile.birth_village || null,
          profile.phone || null, profile.email || null, profile.reg_province_id || null, profile.reg_district_id || null, profile.reg_village || null,
          profile.residence_type_id || null, profile.res_province_id || null, profile.res_district_id || null, profile.res_village || null,
          finalPhotoPath
        ]
      );

      // 4. Insert education records
      if (educationRecords && educationRecords.length > 0) {
        for (const edu of educationRecords) {
          await client.query(
            `INSERT INTO student_education_records (
              student_id, record_type, school_name, graduation_year,
              school_province_id, school_district_id,
              institution_name, department_name, current_year_level,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
            [
              studentId, edu.record_type,
              edu.school_name || null, edu.graduation_year ? parseInt(edu.graduation_year) || null : null,
              edu.school_province_id || null, edu.school_district_id || null,
              edu.institution_name || null, edu.department_name || null,
              edu.current_year_level ? parseInt(edu.current_year_level) || null : null
            ]
          );
        }
      }

      // 5. Insert emergency contacts
      if (emergencyContacts && emergencyContacts.length > 0) {
        for (const contact of emergencyContacts) {
          await client.query(
            `INSERT INTO student_emergency_contacts (
              student_id, full_name, relationship_id, province_id, district_id,
              village, phone_home, phone_office, phone_mobile, is_primary,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
            [
              studentId, contact.full_name, contact.relationship_id || null,
              contact.province_id || null, contact.district_id || null,
              contact.village || null, contact.phone_home || null,
              contact.phone_office || null, contact.phone_mobile || null,
              contact.is_primary !== undefined ? contact.is_primary : false
            ]
          );
        }
      }

      // 6. Insert work affiliations
      if (workAffiliations && workAffiliations.length > 0) {
        for (const work of workAffiliations) {
          await client.query(
            `INSERT INTO student_work_affiliations (
              student_id, occupation, position, workplace_name,
              department, province_or_ministry, is_active,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
            [
              studentId, work.occupation || null, work.position || null,
              work.workplace_name || null, work.department || null,
              work.province_or_ministry || null,
              work.is_active !== undefined ? work.is_active : true
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Send email with credentials
      try {
        const { sendApprovalEmail } = require('../../services/EmailService');
        const deptResult = await pool.query(
          'SELECT name FROM departments WHERE id = $1',
          [student.department_id]
        );
        const departmentName = deptResult.rows[0]?.name || 'ທົ່ວໄປ';
        const createDate = new Date().toLocaleString('lo-LA', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        await sendApprovalEmail(
          profile.email,
          `${profile.first_name_lo} ${profile.last_name_lo}`,
          studentCode,
          randomPassword,
          departmentName,
          createDate
        );
        console.log(`✅ Email sent to: ${profile.email}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send email:', emailError);
      }

      res.json({ success: true, data: { studentId, userId, studentCode } });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Create Student Full Error:', error);
      res.status(500).json({ error: 'Failed to create student', details: error.message });
    } finally {
      client.release();
    }
  });

  // Update student with all related data
  router.put('/students-full/:studentId', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { studentId } = req.params;
      const {
        user, student, profile, educationRecords, emergencyContacts, workAffiliations
      } = req.body;

      // ✅ Handle photo during update
      let finalPhotoPath = profile.photo_path || null;
      if (finalPhotoPath && finalPhotoPath.startsWith('data:')) {
        // If base64, save to disk (replaces old photo)
        finalPhotoPath = await saveBase64Photo(finalPhotoPath, studentId, client);
      } else if (!finalPhotoPath) {
        // If empty, keep existing photo from DB
        const existingRes = await client.query('SELECT photo_path FROM student_profiles WHERE student_id = $1', [studentId]);
        finalPhotoPath = existingRes.rows[0]?.photo_path || null;
      }

      // 1. Update profile
      await client.query(
        `UPDATE student_profiles SET
          first_name_lo=$1, last_name_lo=$2, first_name_en=$3, last_name_en=$4,
          gender=$5, dob=$6, ethnicity_id=$7, religion_id=$8,
          birth_province_id=$9, birth_district_id=$10, birth_village=$11,
          phone=$12, email=$13, reg_province_id=$14, reg_district_id=$15, reg_village=$16,
          residence_type_id=$17, res_province_id=$18, res_district_id=$19, res_village=$20,
          photo_path=$21, updated_at=NOW()
        WHERE student_id=$22`,
        [
          profile.first_name_lo, profile.last_name_lo, profile.first_name_en || null, profile.last_name_en || null,
          profile.gender, profile.dob, profile.ethnicity_id || null, profile.religion_id || null,
          profile.birth_province_id || null, profile.birth_district_id || null, profile.birth_village || null,
          profile.phone || null, profile.email || null, profile.reg_province_id || null, profile.reg_district_id || null, profile.reg_village || null,
          profile.residence_type_id || null, profile.res_province_id || null, profile.res_district_id || null, profile.res_village || null,
          finalPhotoPath, studentId
        ]
      );

      // 2. Update student record
      await client.query(
        `UPDATE students SET
          department_id=$1, session_id=$2, entry_year_id=$3, current_year_level=$4, status=$5, updated_at=NOW()
        WHERE id=$6`,
        [
          student.department_id || null, student.session_id || null, student.entry_year_id || null,
          student.current_year_level || 1, student.status || 'active', studentId
        ]
      );

      // 3. Update user password if provided
      if (user && user.password && user.password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        // Get user_id from student
        const studentUserResult = await client.query('SELECT user_id FROM students WHERE id = $1', [studentId]);
        const userId = studentUserResult.rows[0]?.user_id;
        if (userId) {
          await client.query(
            'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2',
            [hashedPassword, userId]
          );
        }
      }

      // 4. Update education records (delete old, insert new)
      await client.query('DELETE FROM student_education_records WHERE student_id = $1', [studentId]);
      if (educationRecords && educationRecords.length > 0) {
        for (const edu of educationRecords) {
          await client.query(
            `INSERT INTO student_education_records (
              student_id, record_type, school_name, graduation_year,
              school_province_id, school_district_id,
              institution_name, department_name, current_year_level,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
            [
              studentId, edu.record_type,
              edu.school_name || null, edu.graduation_year ? parseInt(edu.graduation_year) || null : null,
              edu.school_province_id || null, edu.school_district_id || null,
              edu.institution_name || null, edu.department_name || null,
              edu.current_year_level ? parseInt(edu.current_year_level) || null : null
            ]
          );
        }
      }

      // 5. Update emergency contacts (delete old, insert new)
      await client.query('DELETE FROM student_emergency_contacts WHERE student_id = $1', [studentId]);
      if (emergencyContacts && emergencyContacts.length > 0) {
        for (const contact of emergencyContacts) {
          await client.query(
            `INSERT INTO student_emergency_contacts (
              student_id, full_name, relationship_id, province_id, district_id,
              village, phone_home, phone_office, phone_mobile, is_primary,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
            [
              studentId, contact.full_name, contact.relationship_id || null,
              contact.province_id || null, contact.district_id || null,
              contact.village || null, contact.phone_home || null,
              contact.phone_office || null, contact.phone_mobile || null,
              contact.is_primary !== undefined ? contact.is_primary : false
            ]
          );
        }
      }

      // 6. Update work affiliations (delete old, insert new)
      await client.query('DELETE FROM student_work_affiliations WHERE student_id = $1', [studentId]);
      if (workAffiliations && workAffiliations.length > 0) {
        for (const work of workAffiliations) {
          await client.query(
            `INSERT INTO student_work_affiliations (
              student_id, occupation, position, workplace_name,
              department, province_or_ministry, is_active,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
            [
              studentId, work.occupation || null, work.position || null,
              work.workplace_name || null, work.department || null,
              work.province_or_ministry || null,
              work.is_active !== undefined ? work.is_active : true
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, data: { studentId } });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Update Student Full Error:', error);
      res.status(500).json({ error: 'Failed to update student', details: error.message });
    } finally {
      client.release();
    }
  });

  // Upload photo and update profile
  router.post('/students/:id/upload-photo', async (req: Request, res: Response) => {
    // This route already exists in uploadRoutes.ts, so we don't duplicate
    res.json({ success: true, message: 'Use /api/upload/students/:id/upload-photo' });
  });

  return router;
};
