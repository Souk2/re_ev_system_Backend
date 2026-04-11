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

  [uploadsDir, staffDir, teacherDir, applicationDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // ==================== UPLOAD ENDPOINTS ====================

  // Upload photo for staff by ID
  router.post('/staff/:id/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;
      
      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `staff_${req.params.id}_${timestamp}${ext}`;
      const filepath = path.join(staffDir, filename);
      
      fs.writeFileSync(filepath, buffer);
      
      const photoPath = `uploads/staff/${filename}`;
      
      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for staff by user ID
  router.post('/staff/user/:userId/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;
      
      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `staff_user_${req.params.userId}_${timestamp}${ext}`;
      const filepath = path.join(staffDir, filename);
      
      fs.writeFileSync(filepath, buffer);
      
      const photoPath = `uploads/staff/${filename}`;
      
      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for teachers by ID
  router.post('/teachers/:id/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;
      
      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `teacher_${req.params.id}_${timestamp}${ext}`;
      const filepath = path.join(teacherDir, filename);
      
      fs.writeFileSync(filepath, buffer);
      
      const photoPath = `uploads/teachers/${filename}`;
      
      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

  // Upload photo for teachers by user ID
  router.post('/teachers/user/:userId/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;
      
      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `teacher_${req.params.userId}_${timestamp}${ext}`;
      const filepath = path.join(teacherDir, filename);
      
      fs.writeFileSync(filepath, buffer);
      
      const photoPath = `uploads/teachers/${filename}`;
      
      res.json({
        success: true,
        data: { photo_path: photoPath }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
    }
  });

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

  // Upload photo for students by ID
  router.post('/students/:id/upload-photo', async (req: Request, res: Response) => {
    try {
      const { photo_data, photo_name } = req.body;

      if (!photo_data) {
        return res.status(400).json({ success: false, error: 'ບໍ່ມີຂໍ້ມູນຮູບ' });
      }

      const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const ext = photo_name ? path.extname(photo_name) : '.jpg';
      const filename = `student_${req.params.id}_${timestamp}${ext}`;
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

  return router;
};
