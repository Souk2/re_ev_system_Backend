import { BaseRepository } from './baseRepository';

export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'staff' | 'student' | 'teacher';
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
}

export class UserRepository extends BaseRepository {
  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const result = await this.query<UserRecord>(
      `SELECT id, username, password_hash, role, is_active, created_at, updated_at
       FROM users
       WHERE username = $1`,
      [username]
    );
    return result.rows[0];
  }

  async findWithProfile(username: string) {
    const result = await this.query(
      `SELECT
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
      WHERE u.username = $1`,
      [username]
    );
    return result.rows[0];
  }

  async findById(userId: string) {
    const result = await this.query<UserRecord>(
      `SELECT id, username, role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, userId]
    );
  }
}

export const userRepository = new UserRepository();
