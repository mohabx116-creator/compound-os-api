import { z } from 'zod';
import type {
  updateProfileSchema,
  changePasswordSchema,
  updateCompoundSettingsSchema,
} from './admin-settings.schema.js';

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateCompoundSettingsInput = z.infer<typeof updateCompoundSettingsSchema>;
