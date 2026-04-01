export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  enableLocalAuth: process.env.ENABLE_LOCAL_AUTH?.trim() === 'true',
  gasWebhookSecret: process.env.GAS_WEBHOOK_SECRET,
  salesforceWebhookSecret: process.env.SALESFORCE_WEBHOOK_SECRET,
  webhookSecret: process.env.WEBHOOK_SECRET,
  allowedWebhookIps: process.env.ALLOWED_WEBHOOK_IPS?.split(','),
});

