import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'localhost')
    .default('localhost'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  FRONTEND_URL: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('true'),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Auth
  CSRF_SECRET: Joi.string().required(),
  ENABLE_LOCAL_AUTH: Joi.boolean().default(false),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),
  ALLOWED_GOOGLE_DOMAINS: Joi.string().optional(),

  // Webhooks
  WEBHOOK_SECRET: Joi.string().required(),
  GAS_WEBHOOK_SECRET: Joi.string().optional(),
  SALESFORCE_WEBHOOK_SECRET: Joi.string().optional(),
  ALLOWED_WEBHOOK_IPS: Joi.string().default('127.0.0.1,::1'),

  // Queue
  QUEUE_PRIORITY_TYPES: Joi.string().default('Menu Typing,please correct error'),
});