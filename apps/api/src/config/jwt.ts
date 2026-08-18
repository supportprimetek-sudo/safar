import dotenv from 'dotenv';
dotenv.config();

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'safar_jwt_secret_key_production_ready_2026_super_secure';
}
