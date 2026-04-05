import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'localhost')
    .default('localhost'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('true'),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CSRF_SECRET: Joi.string().required(),
  WEBHOOK_SECRET: Joi.string().required(),
  GAS_WEBHOOK_SECRET: Joi.string().optional(),
  SALESFORCE_WEBHOOK_SECRET: Joi.string().optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  ALLOWED_WEBHOOK_IPS: Joi.string().default('127.0.0.1,::1'),
  QUEUE_PRIORITY_TYPES: Joi.string().default('Menu Typing,please corcect error'),
});
