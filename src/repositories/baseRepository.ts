import { Pool, QueryResult, QueryResultRow } from 'pg';
import { pool } from '../config/database';

export class BaseRepository {
  protected pool: Pool;

  constructor() {
    this.pool = pool;
  }

  protected async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }
}
