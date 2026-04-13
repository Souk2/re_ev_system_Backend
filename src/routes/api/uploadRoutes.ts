import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const createUploadRoutes = () => {
  const router = Router();

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const staffDir = path.join(uploadsDir, 'staff');
  const teacherDir = path.join(uploadsDir, 'teachers');
  const applicationDir = path.join(uploadsDir, 'applications');
  const studentDir = path.join(uploadsDir, 'students');

  [uploadsDir, staffDir, teacherDir, applicationDir, studentDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // ==================== HELPER FUNCTIONS ====================

  // Delete old photo file if it exists
  const deleteOldPhoto = (photoPath: string | null): void => {
    if (!photoPath) return;
    
    const fullPath = path.join(process.cwd(), photoPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`✅ Deleted old photo: ${photoPath}`);
      } catch (err) {
        console.error(`⚠️ Failed to delete old photo: ${photoPath}`, err);
      }
    }
  };

  // Move photo from applications to students directory with student code name
  const movePhotoToStudents = (
    oldPhotoPath: string,
    studentCode: string
  ): string | null => {
    try {
      const oldFullPath = path.join(process.cwd(), oldPhotoPath);
      
      if (!fs.existsSync(oldFullPath)) {
        console.warn(`⚠️ Source photo not found: ${oldPhotoPath}`);
        return null;
      }

      // Get file extension
      const ext = path.extname(oldPhotoPath);
      
      // New filename: student_code.ext
      const newFilename = `${studentCode}${ext}`;
      const newFullPath = path.join(studentDir, newFilename);

      // Copy file to new location
      fs.copyFileSync(oldFullPath, newFullPath);
      
      // Delete old file
      fs.unlinkSync(oldFullPath);

      const newPath = `uploads/students/${newFilename}`;
      console.log(`✅ Moved photo: ${oldPhotoPath} -> ${newPath}`);
      
      return newPath;
    } catch (err) {
      console.error(`❌ Failed to move photo: ${oldPhotoPath}`, err);
      return null;
    }
  };

  // ==================== APPLICATION FORM UPLOADS ====================

  // Upload 3x4 photo for application
  router.post('/applications/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `photo_${timestamp}${ext}`;
      const filepath = path.join(applicationDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/applications/${filename}`;

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload ID card for application
  router.post('/applications/upload-id-card', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນບັດປະຈຳຕົວ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `idcard_${timestamp}${ext}`;
      const filepath = path.join(applicationDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/applications/${filename}`;

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດບັດປະຈຳຕົວບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for students by ID (replaces old photo)
  router.post('/students/:id/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const studentId = req.params.id;

      // Get student_code from students table
      const { pool } = await import('../../config/database');
      const result = await pool.query(
        'SELECT s.student_code FROM students s WHERE s.id = $1',
        [studentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'ບໍ່ພົບນັກສຶກສາ' });
      }

      const studentCode = result.rows[0].student_code;

      // Get current photo path to delete it
      const photoResult = await pool.query(
        'SELECT photo_path FROM student_profiles WHERE student_id = $1',
        [studentId]
      );

      const oldPhotoPath = photoResult.rows.length > 0 ? photoResult.rows[0].photo_path : null;

      // Delete old photo file
      deleteOldPhoto(oldPhotoPath);

      // Create new photo with student code name
      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Determine file extension
      const mimeType = photo_data.match(/data:(image\/\w+);base64/);
      const ext = mimeType ? 
        (mimeType[1].includes('png') ? '.png' : mimeType[1].includes('gif') ? '.gif' : '.jpg') 
        : (photo_name ? path.extname(photo_name) : '.jpg');
      
      const filename = `${studentCode}${ext}`;
      const filepath = path.join(studentDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/students/${filename}`;

      // Update database with new photo path
      if (photoResult.rows.length > 0) {
        await pool.query(
          'UPDATE student_profiles SET photo_path = $1, updated_at = NOW() WHERE student_id = $2',
          [photoPath, studentId]
        );
      } else {
        await pool.query(
          'INSERT INTO student_profiles (student_id, photo_path, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
          [studentId, photoPath]
        );
      }

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // ==================== UPLOAD ENDPOINTS ====================

  // Upload photo for staff by ID (replaces old photo)
  router.post('/staff/:id/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const staffId = req.params.id;

      // Get current photo path to delete it
      const { pool } = await import('../../config/database');
      const photoResult = await pool.query(
        'SELECT photo_path FROM staff WHERE id = $1',
        [staffId]
      );

      const oldPhotoPath = photoResult.rows.length > 0 ? photoResult.rows[0].photo_path : null;

      // Delete old photo file
      deleteOldPhoto(oldPhotoPath);

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `staff_${staffId}_${timestamp}${ext}`;
      const filepath = path.join(staffDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/staff/${filename}`;

      // Update database with new photo path
      if (photoResult.rows.length > 0) {
        await pool.query(
          'UPDATE staff SET photo_path = $1 WHERE id = $2',
          [photoPath, staffId]
        );
      }

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for staff by user ID (replaces old photo)
  router.post('/staff/user/:userId/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const userId = req.params.userId;

      // Get current photo path to delete it
      const { pool } = await import('../../config/database');
      const photoResult = await pool.query(
        'SELECT photo_path FROM staff WHERE user_id = $1',
        [userId]
      );

      const oldPhotoPath = photoResult.rows.length > 0 ? photoResult.rows[0].photo_path : null;

      // Delete old photo file
      deleteOldPhoto(oldPhotoPath);

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `staff_user_${userId}_${timestamp}${ext}`;
      const filepath = path.join(staffDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/staff/${filename}`;

      // Update database with new photo path
      if (photoResult.rows.length > 0) {
        await pool.query(
          'UPDATE staff SET photo_path = $1 WHERE user_id = $2',
          [photoPath, userId]
        );
      }

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for teachers by ID (replaces old photo)
  router.post('/teachers/:id/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const teacherId = req.params.id;

      // Get current photo path to delete it
      const { pool } = await import('../../config/database');
      const photoResult = await pool.query(
        'SELECT photo_path FROM teachers WHERE id = $1',
        [teacherId]
      );

      const oldPhotoPath = photoResult.rows.length > 0 ? photoResult.rows[0].photo_path : null;

      // Delete old photo file
      deleteOldPhoto(oldPhotoPath);

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `teacher_${teacherId}_${timestamp}${ext}`;
      const filepath = path.join(teacherDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/teachers/${filename}`;

      // Update database with new photo path
      if (photoResult.rows.length > 0) {
        await pool.query(
          'UPDATE teachers SET photo_path = $1 WHERE id = $2',
          [photoPath, teacherId]
        );
      }

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for teachers by user ID (replaces old photo)
  router.post('/teachers/user/:userId/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const userId = req.params.userId;

      // Get current photo path to delete it
      const { pool } = await import('../../config/database');
      const photoResult = await pool.query(
        'SELECT photo_path FROM teachers WHERE user_id = $1',
        [userId]
      );

      const oldPhotoPath = photoResult.rows.length > 0 ? photoResult.rows[0].photo_path : null;

      // Delete old photo file
      deleteOldPhoto(oldPhotoPath);

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `teacher_${userId}_${timestamp}${ext}`;
      const filepath = path.join(teacherDir, filename);

      fs.writeFileSync(filepath, buffer);

      const photoPath = `uploads/teachers/${filename}`;

      // Update database with new photo path
      if (photoResult.rows.length > 0) {
        await pool.query(
          'UPDATE teachers SET photo_path = $1 WHERE user_id = $2',
          [photoPath, userId]
        );
      }

      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  return router;
};
