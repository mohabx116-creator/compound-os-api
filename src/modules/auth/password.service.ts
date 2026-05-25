import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, env.PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
