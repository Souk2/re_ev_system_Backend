import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

interface LoginRequest {
  username: string;
  password: string;
}

interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginRequest = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ'
      });
      return;
    }

    // Query user from database
    const query = `
      SELECT 
        u.id,
        u.username,
        u.password_hash,
        u.role,
        u.is_active,
        CASE 
          WHEN u.role = 'staff' THEN s.id
          WHEN u.role = 'student' THEN st.id
          WHEN u.role = 'teacher' THEN t.id
          ELSE NULL
        END as profile_id
      FROM users u
      LEFT JOIN staff s ON u.id = s.user_id
      LEFT JOIN students st ON u.id = st.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      WHERE u.username = $1
    `;

    const result = await pool.query(query, [username]);

    // Check if user exists
    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ'
      });
      return;
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: 'ບັນຊີຖືກປິດການໃຊ້ງານ. ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບ'
      });
      return;
    }

    // Verify password
    // Note: PostgreSQL uses crypt() with gen_salt('bf') which is bcrypt
    // We need to compare with the stored hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Log failed login attempt
      await pool.query(
        `INSERT INTO audit_logs (log_category, table_name, record_id, action, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['AUTH', 'users', user.id, 'LOGIN_FAILED', 'ປ້ອນລະຫັດຜ່ານຜິດ', JSON.stringify({ username })]
      );

      res.status(401).json({
        success: false,
        error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ'
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 're_ev_system_secret_key_2024_change_in_production';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn']
    } as jwt.SignOptions);

    // Log successful login
    await pool.query(
      `INSERT INTO audit_logs (log_category, table_name, record_id, action, description, performed_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['AUTH', 'users', user.id, 'LOGIN_SUCCESS', 'User logged in successfully', user.id, JSON.stringify({ username })]
    );

    // Get user profile data based on role
    let profileData = null;
    if (user.role === 'staff' && user.profile_id) {
      const profileResult = await pool.query(
        'SELECT * FROM staff WHERE id = $1',
        [user.profile_id]
      );
      profileData = profileResult.rows[0];
    } else if (user.role === 'student' && user.profile_id) {
      const profileResult = await pool.query(
        'SELECT s.*, sp.first_name_lo, sp.last_name_lo, sp.email FROM students s LEFT JOIN student_profiles sp ON s.id = sp.student_id WHERE s.id = $1',
        [user.profile_id]
      );
      profileData = profileResult.rows[0];
    } else if (user.role === 'teacher' && user.profile_id) {
      const profileResult = await pool.query(
        'SELECT * FROM teachers WHERE id = $1',
        [user.profile_id]
      );
      profileData = profileResult.rows[0];
    }

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          profile: profileData
        }
      }
    });

  } catch (error) {
    console.error('ຂໍ້ຜິດພາດການເຂົ້າສູ່ລະບົບ:', error);
    res.status(500).json({
      success: false,
      error: 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'ມີບາງຢ່າງຜິດພາດ'
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'ບໍ່ມີສິດເຂົ້າເຖິງ'
      });
      return;
    }

    // Get user info
    const userResult = await pool.query(
      'SELECT id, username, role, is_active, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'ບໍ່ພົບຜູ້ໃຊ້'
      });
      return;
    }

    const user = userResult.rows[0];

    // Get profile based on role
    let profileData = null;
    if (user.role === 'staff') {
      const profileResult = await pool.query(
        'SELECT s.*, d.name as department_name FROM staff s LEFT JOIN departments d ON s.department_id = d.id WHERE s.user_id = $1',
        [userId]
      );
      profileData = profileResult.rows[0];
    } else if (user.role === 'student') {
      const profileResult = await pool.query(
        `SELECT s.*, sp.first_name_lo, sp.last_name_lo, sp.first_name_en, sp.last_name_en, 
                sp.gender, sp.dob, d.name as department_name
         FROM students s 
         LEFT JOIN student_profiles sp ON s.id = sp.student_id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [userId]
      );
      profileData = profileResult.rows[0];
    } else if (user.role === 'teacher') {
      const profileResult = await pool.query(
        'SELECT * FROM teachers WHERE user_id = $1',
        [userId]
      );
      profileData = profileResult.rows[0];
    }

    res.json({
      success: true,
      data: {
        ...user,
        profile: profileData
      }
    });

  } catch (error) {
    console.error('ຂໍ້ຜິດພາດການດຶງຂໍ້ມູນໂປຣໄຟລ໌:', error);
    res.status(500).json({
      success: false,
      error: 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ'
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາປ້ອນລະຫັດຜ່ານປັດຈຸບັນ ແລະ ລະຫັດຜ່ານໃໝ່'
      });
      return;
    }

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'ບໍ່ພົບຜູ້ໃຊ້'
      });
      return;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ'
      });
      return;
    }

    // Hash new password
    // Note: In production, you should use pgcrypto on database side for consistency
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    // Log password change
    await pool.query(
      `INSERT INTO audit_logs (log_category, table_name, record_id, action, description, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['AUTH', 'users', userId, 'PASSWORD_CHANGED', 'User changed password', userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('ຂໍ້ຜິດພາດການປ່ຽນລະຫັດຜ່ານ:', error);
    res.status(500).json({
      success: false,
      error: 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ'
    });
  }
};
