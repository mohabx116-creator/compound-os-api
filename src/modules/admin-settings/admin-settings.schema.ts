import { z } from 'zod';

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120).optional(),
    email: z.string().trim().email('Invalid email address').max(255).optional(),
    phone: z.string().trim().min(1, 'Phone is required').max(30).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateCompoundSettingsSchema = z
  .object({
    name: z.string().trim().min(1, 'Compound name is required').max(120).optional(),
    address: optionalText(500),
    phone: optionalText(30),
    email: z.string().trim().email('Invalid email address').max(255).optional(),
    logoUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid logo URL').max(1000).optional(),
    ),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
