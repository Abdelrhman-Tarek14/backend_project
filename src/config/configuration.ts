export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '1d',
  },
  enableLocalAuth: process.env.ENABLE_LOCAL_AUTH?.trim() === 'true',
  gasWebhookSecret: process.env.GAS_WEBHOOK_SECRET || 'fallback-secret-for-dev',
  salesforceWebhookSecret: process.env.SALESFORCE_WEBHOOK_SECRET || 'sf-fallback-secret-for-dev',
});
