import { z } from 'zod';

const publicRatingTypeSchema = z.literal('SITE_EXPERIENCE');

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const sourcePageSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .string()
    .trim()
    .max(200)
    .refine((value) => value.startsWith('/'), 'Source page must be a path starting with /')
    .optional(),
);

const clientInteractionMsSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).max(86_400_000).optional(),
);

export const submitRatingSchema = z
  .object({
    type: publicRatingTypeSchema,
    rating: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().int().min(1).max(5),
    ),
    comment: optionalText(500),
    sourcePage: sourcePageSchema,
    promptVersion: optionalText(50),
    honeypot: optionalText(120),
    clientInteractionMs: clientInteractionMsSchema,
    visitorToken: optionalText(120),
  })
  .strict();

export const ratingSummaryQuerySchema = z
  .object({
    type: z.preprocess(
      (value) => (value === '' ? undefined : value),
      publicRatingTypeSchema.optional().default('SITE_EXPERIENCE'),
    ),
  })
  .strict();
