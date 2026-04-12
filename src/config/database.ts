import { Pool, types } from 'pg';
import { config } from 'dotenv';

config();

// Fix DATE type parsing: return as string instead of Date object
// PostgreSQL DATE OID is 1082
types.setTypeParser(1082, (val: string) => val);

// Parse JSONB (OID 3802) and JSON (OID 114) automatically
types.setTypeParser(3802, (val: string) => JSON.parse(val));
types.setTypeParser(114, (val: string) => JSON.parse(val));

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 're_ev_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // ຢ່າ exit, ໃຫ້ pool reconnect ອັດຕະໂນມັດ
});

// Helper function to test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('🕐 Database time:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

export default pool;
