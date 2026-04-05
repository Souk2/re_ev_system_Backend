import { BaseRepository } from './baseRepository';

export class ProfileRepository extends BaseRepository {
  async getStaffProfile(userId: string) {
    const result = await this.query(
      `SELECT s.*, d.name as department_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async getStudentProfile(userId: string) {
    const result = await this.query(
      `SELECT s.*, sp.first_name_lo, sp.last_name_lo, sp.first_name_en, sp.last_name_en,
              sp.gender, sp.dob, d.name as department_name
       FROM students s
       LEFT JOIN student_profiles sp ON s.id = sp.student_id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async getTeacherProfile(userId: string) {
    const result = await this.query(
      `SELECT * FROM teachers WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async getProfileByRole(role: string, userId: string) {
    switch (role) {
      case 'staff':
        return this.getStaffProfile(userId);
      case 'student':
        return this.getStudentProfile(userId);
      case 'teacher':
        return this.getTeacherProfile(userId);
      default:
        return null;
    }
  }
}

export const profileRepository = new ProfileRepository();
