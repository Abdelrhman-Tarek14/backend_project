import { z } from 'zod';

export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),

  // Auth
  CSRF_SECRET: z.string().min(1),
  ENABLE_LOCAL_AUTH: z.coerce.boolean().default(false),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  ALLOWED_GOOGLE_DOMAINS: z.string().optional(),

  // Webhooks
  SHEET_WEBHOOK_SECRET: z.string().min(1),
  SALESFORCE_WEBHOOK_SECRET: z.string().min(1),
  ALLOWED_WEBHOOK_IPS: z.string().min(1),

  // Queue
  QUEUE_PRIORITY_TYPES: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.GOOGLE_CLIENT_ID) {
    if (!data.GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is provided",
        path: ["GOOGLE_CLIENT_SECRET"]
      });
    }
    if (!data.GOOGLE_CALLBACK_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CALLBACK_URL is required when GOOGLE_CLIENT_ID is provided",
        path: ["GOOGLE_CALLBACK_URL"]
      });
    }
  }
});

export function validate(config: Record<string, unknown>) {
  const parsed = envValidationSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Config validation error: ${parsed.error.message}`);
  }
  return parsed.data;
}