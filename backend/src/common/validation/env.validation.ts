import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),

  PORT: Joi.number().port().required(),
  DATABASE_URL: Joi.string().required(),
  FRONTEND_URL: Joi.string().required(),
  CORS_ORIGIN: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  // Auth
  CSRF_SECRET: Joi.string().required(),
  ENABLE_LOCAL_AUTH: Joi.boolean().default(false),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.when('GOOGLE_CLIENT_ID', {
    is: Joi.exist(),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  GOOGLE_CALLBACK_URL: Joi.when('GOOGLE_CLIENT_ID', {
    is: Joi.exist(),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  ALLOWED_GOOGLE_DOMAINS: Joi.string().optional(),

  // Webhooks
  SHEET_WEBHOOK_SECRET: Joi.string().required(),
  SALESFORCE_WEBHOOK_SECRET: Joi.string().required(),
  ALLOWED_WEBHOOK_IPS: Joi.string().required(),

  // Queue
  QUEUE_PRIORITY_TYPES: Joi.string().required(),
});