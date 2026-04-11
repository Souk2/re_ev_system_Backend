import { pool } from '../config/database';
import { tableConfigs } from '../config/tables';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

export class BaseService {
  
  // ດຶງຂໍ້ມູນທັງໝົດ
  async getAll(tableName: string, req: Request, res: Response) {
    const config = tableConfigs[tableName];
    if (!config) return res.status(404).json({ error: 'Table not found' });

    // ✅ ປິດ Cache ບັງຄັບໃຫ້ດຶງຂໍ້ມູນໃໝ່
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const cols = config.columns.join(', ');

      // ✅ ໃຊ້ ORDER BY id ຖ້າບໍ່ມີ created_at ເພື່ອປ້ອງກັນ Error
      const orderByCol = config.columns.includes('created_at') ? 'created_at' : 'id';

      // 🆕 NEW: Handle Query Params as Filters (e.g., ?status=pending)
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(req.query)) {
        // Skip pagination and internal params
        if (['page', 'limit', '_t', 'sort', 'order'].includes(key)) continue;
        
        // Check if key is a valid column and value is present
        if (config.columns.includes(key) && value !== undefined && value !== '') {
          whereClauses.push(`${key} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      }

      const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count Query with Filter
      const countQuery = `SELECT COUNT(*) FROM ${tableName} ${whereString}`;
      const countRes = await pool.query(countQuery, queryParams);
      const total = parseInt(countRes.rows[0].count);

      // Data Query with Filter and Pagination
      // Note: Placeholders $1, $2... must match the order in queryParams array
      const dataQuery = `SELECT id, ${cols} FROM ${tableName} ${whereString} ORDER BY ${orderByCol} DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const dataRes = await pool.query(dataQuery, queryParams);

      res.json({
        success: true,
        data: dataRes.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error(`❌ Error getting ${tableName}:`, error);
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
    }
  }

  // ດຶງຂໍ້ມູນລາຍການດຽວ
  async getById(tableName: string, req: Request, res: Response) {
    const { id } = req.params;
    const config = tableConfigs[tableName];
    if (!config) return res.status(404).json({ error: 'Table not found' });

    try {
      const cols = config.columns.join(', ');
      const query = `SELECT id, ${cols} FROM ${tableName} WHERE id = $1`;
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ເພີ່ມຂໍ້ມູນໃໝ່
  async create(tableName: string, req: Request, res: Response) {
    const config = tableConfigs[tableName];
    if (!config) return res.status(404).json({ error: 'Table not found' });

    let body = { ...req.body };

    // Clean up empty strings for optional UUID fields and convert to null
    // This prevents PostgreSQL errors from empty strings in UUID columns
    const uuidFields = [
      'ethnicity_id', 'religion_id', 'birth_province_id', 'birth_district_id',
      'reg_province_id', 'reg_district_id', 'residence_type_id', 'res_province_id',
      'res_district_id', 'applied_department_id', 'reviewed_by', 'department_id'
    ];

    for (const field of uuidFields) {
      if (body[field] === '' || body[field] === undefined) {
        body[field] = null;
      }
    }

    // Ensure JSONB fields are valid JSON strings
    const jsonbFields = ['emergency_contacts', 'education_records', 'work_affiliations'];
    for (const field of jsonbFields) {
      if (typeof body[field] === 'string') {
        try {
          JSON.parse(body[field]); // Validate JSON
        } catch {
          body[field] = '[]'; // Default to empty array if invalid
        }
      } else if (!Array.isArray(body[field]) && body[field] !== null) {
        body[field] = []; // Default to array if not array
      }
    }

    const bodyKeys = Object.keys(body);
    const allowedKeys = bodyKeys.filter(key => config.columns.includes(key));

    if (allowedKeys.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    // Handle Password Hashing for Users
    if (tableName === 'users' && body.password) {
      body.password_hash = await bcrypt.hash(body.password, 10);
      const idx = allowedKeys.indexOf('password');
      if (idx > -1) allowedKeys.splice(idx, 1);
      if (!allowedKeys.includes('password_hash')) allowedKeys.push('password_hash');
      if (!body.role) body.role = 'staff';
    }

    const columns = allowedKeys.join(', ');
    const placeholders = allowedKeys.map((_, i) => `$${i + 1}`).join(', ');

    const values = allowedKeys.map(key => {
        if (key === 'password_hash') return body.password_hash;
        // Stringify JSONB fields for PostgreSQL
        if (['emergency_contacts', 'education_records', 'work_affiliations'].includes(key)) {
          return JSON.stringify(body[key]);
        }
        return body[key];
    });

    try {
      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      console.log(`📝 Inserting into ${tableName}...`, { columns: allowedKeys, values });
      const result = await pool.query(query, values);

      console.log(`✅ Created ${tableName}:`, result.rows[0].id);
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error(`❌ Error creating ${tableName}:`, error.message);
      console.error(`❌ Full error:`, error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message,
        hint: error.hint 
      });
    }
  }

  // ແກ້ໄຂຂໍ້ມູນ (UPDATE)
  async update(tableName: string, req: Request, res: Response) {
    const { id } = req.params;
    const config = tableConfigs[tableName];
    if (!config) return res.status(404).json({ error: 'Table not found' });

    const bodyKeys = Object.keys(req.body);
    const allowedKeys = bodyKeys.filter(key => config.columns.includes(key));

    if (allowedKeys.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    const setClause = allowedKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = allowedKeys.map(key => req.body[key]);

    try {
      const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $${allowedKeys.length + 1} RETURNING *`;
      values.push(id);

      console.log(`🔄 Updating ${tableName} (ID: ${id})...`, { keys: allowedKeys, values, query });
      const result = await pool.query(query, values);
      console.log(`📊 Update result rows:`, result.rows.length);

      if (result.rows.length === 0) {
        console.log(`⚠️ No rows updated in ${tableName} for ID: ${id}`);
        return res.status(404).json({ error: `Record not found in ${tableName}` });
      }

      console.log(`✅ Updated ${tableName}:`, result.rows[0].name || result.rows[0].code || result.rows[0].student_code || result.rows[0].id);
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error(`❌ Error updating ${tableName}:`, error.message);
      console.error(`❌ Full error:`, error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  // ລຶບຂໍ້ມູນ
  async delete(tableName: string, req: Request, res: Response) {
    const { id } = req.params;
    const config = tableConfigs[tableName];
    if (!config) return res.status(404).json({ error: 'Table not found' });

    try {
      const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING id`;
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      console.log(`🗑️ Deleted ${tableName} (ID: ${id})`);
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const baseService = new BaseService();
