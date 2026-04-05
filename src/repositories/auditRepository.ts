import { BaseRepository } from './baseRepository';

export class AuditRepository extends BaseRepository {
  async logLogin(userId: string, username: string): Promise<void> {
    await this.query(
      `INSERT INTO audit_logs (log_category, table_name, record_id, action, description, performed_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['AUTH', 'users', userId, 'LOGIN_SUCCESS', 'User logged in successfully', userId, JSON.stringify({ username })]
    );
  }

  async logFailedLogin(userId: string | null, username: string): Promise<void> {
    await this.query(
      `INSERT INTO audit_logs (log_category, table_name, record_id, action, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['AUTH', 'users', userId, 'LOGIN_FAILED', 'Invalid password attempt', JSON.stringify({ username })]
    );
  }

  async logPasswordChange(userId: string): Promise<void> {
    await this.query(
      `INSERT INTO audit_logs (log_category, table_name, record_id, action, description, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['AUTH', 'users', userId, 'PASSWORD_CHANGED', 'User changed password', userId]
    );
  }
}

export const auditRepository = new AuditRepository();
