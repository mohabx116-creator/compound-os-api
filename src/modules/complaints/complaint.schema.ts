import { z } from 'zod';

const complaintPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const complaintStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'ESCALATED',
]);

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(150, 'Title must be at most 150 characters');

const descriptionSchema = z
  .string()
  .trim()
  .min(1, 'Description is required')
  .max(2000, 'Description must be at most 2000 characters');

const optionalSearch = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().max(100).optional(),
);

export const createComplaintSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id'),
    residentId: z.string().uuid('Invalid resident id'),
    unitId: z.string().uuid('Invalid unit id').optional(),
    title: titleSchema,
    description: descriptionSchema,
    priority: complaintPrioritySchema.optional(),
    status: complaintStatusSchema.optional(),
  })
  .strict();

export const updateComplaintSchema = z
  .object({
    unitId: z.string().uuid('Invalid unit id').nullable().optional(),
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    priority: complaintPrioritySchema.optional(),
    status: complaintStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const complaintQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  residentId: z.string().uuid('Invalid resident id').optional(),
  unitId: z.string().uuid('Invalid unit id').optional(),
  status: complaintStatusSchema.optional(),
  priority: complaintPrioritySchema.optional(),
});

export const complaintParamsSchema = z.object({
  id: z.string().uuid('Invalid complaint id'),
});
