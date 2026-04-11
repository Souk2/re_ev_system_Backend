import { config } from 'dotenv';
config();

export const JWT_SECRET = process.env.JWT_SECRET || 're_ev_system_secret_key_2024_change_in_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Warning: JWT_SECRET is not set in environment variables. Using default (INSECURE FOR PRODUCTION).');
}
