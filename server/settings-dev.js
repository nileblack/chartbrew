module.exports = {
  port: process.env.CB_API_PORT_DEV,
  secret: process.env.CB_SECRET_DEV,
  encryptionKey: process.env.CB_ENCRYPTION_KEY_DEV,
  client: process.env.VITE_APP_CLIENT_HOST_DEV,
  api: process.env.CB_API_HOST_DEV,
  adminMail: process.env.CB_ADMIN_MAIL_DEV,
  mailSettings: {
    host: process.env.CB_MAIL_HOST_DEV,
    port: process.env.CB_MAIL_PORT_DEV || 465,
    secure: process.env.CB_MAIL_SECURE_DEV,
    auth: {
      user: process.env.CB_MAIL_USER_DEV,
      pass: process.env.CB_MAIL_PASS_DEV,
    },
  },
  google: {
    client_id: process.env.CB_GOOGLE_CLIENT_ID_DEV,
    client_secret: process.env.CB_GOOGLE_CLIENT_SECRET_DEV,
    redirect_url: "/google-auth",
  },
  teamRestricted: process.env.CB_RESTRICT_TEAMS_DEV,
  signupRestricted: process.env.CB_RESTRICT_SIGNUP_DEV,
  chartbrewMainAPI: "https://api.chartbrew.com",
  openai: {
    apiKey: process.env.CB_OPENAI_API_KEY,
    endpoint: process.env.CB_OPENAI_ENDPOINT || "https://api.openai.com/v1",
    model: process.env.CB_OPENAI_MODEL || "gpt-4-turbo-preview",
    temperature: process.env.CB_OPENAI_TEMPERATURE || 0.7,
    maxTokens: process.env.CB_OPENAI_MAX_TOKENS || 2000,
  },  
  chromadb: {
    path: process.env.CB_CHROMADB_PATH || "http://localhost:8000",
    collection: process.env.CB_CHROMADB_COLLECTION || "schema_store"
  }
};
