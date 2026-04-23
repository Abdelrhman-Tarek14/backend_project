export default () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    enableLocalAuth: String(process.env.ENABLE_LOCAL_AUTH) === 'true',
    csrfSecret: process.env.CSRF_SECRET,
  },
  integrations: {
    sheetWebhookSecret: process.env.SHEET_WEBHOOK_SECRET,
    salesforceWebhookSecret: process.env.SALESFORCE_WEBHOOK_SECRET,
    allowedWebhookIps: process.env.ALLOWED_WEBHOOK_IPS?.split(',') || [],
  },
  corsOrigin: process.env.CORS_ORIGIN === 'true' ? true : process.env.CORS_ORIGIN,
  queuePriorityTypes: (process.env.QUEUE_PRIORITY_TYPES || 'Menu Typing,please correct error')
    .split(',')
    .map((s) => s.trim().toLowerCase()),
  allowedGoogleDomains: process.env.ALLOWED_GOOGLE_DOMAINS
    ? process.env.ALLOWED_GOOGLE_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter((d) => d.length > 0)
    : [],
});
