import { pool } from '../config/database';
import { tableConfigs } from '../config/tables';
import { Request, Response } from 'express';

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
      
      const countQuery = `SELECT COUNT(*) FROM ${tableName}`;
      const dataQuery = `SELECT id, ${cols} FROM ${tableName} ORDER BY ${orderByCol} DESC LIMIT $1 OFFSET $2`;

      const countRes = await pool.query(countQuery);
      const total = parseInt(countRes.rows[0].count);

      const dataRes = await pool.query(dataQuery, [limit, offset]);

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

    const bodyKeys = Object.keys(req.body);
    const allowedKeys = bodyKeys.filter(key => config.columns.includes(key));
    
    if (allowedKeys.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    const columns = allowedKeys.join(', ');
    const placeholders = allowedKeys.map((_, i) => `$${i + 1}`).join(', ');
    const values = allowedKeys.map(key => req.body[key]);

    try {
      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(query, values);

      console.log(`✅ Created ${tableName}:`, result.rows[0].name || result.rows[0].code);
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error(`❌ Error creating ${tableName}:`, error);
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
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
      
      console.log(`🔄 Updating ${tableName} (ID: ${id})...`, { keys: allowedKeys, values });
      const result = await pool.query(query, values);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      console.log(`✅ Updated ${tableName}:`, result.rows[0].name || result.rows[0].code);
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error(`❌ Error updating ${tableName}:`, error);
      res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
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
