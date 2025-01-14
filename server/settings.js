module.exports = {
  port: process.env.CB_API_PORT,
  secret: process.env.CB_SECRET,
  encryptionKey: process.env.CB_ENCRYPTION_KEY,
  client: process.env.VITE_APP_CLIENT_HOST,
  api: process.env.CB_API_HOST,
  adminMail: process.env.CB_ADMIN_MAIL,
  mailSettings: {
    host: process.env.CB_MAIL_HOST,
    port: process.env.CB_MAIL_PORT || 465,
    secure: process.env.CB_MAIL_SECURE,
    auth: {
      user: process.env.CB_MAIL_USER,
      pass: process.env.CB_MAIL_PASS,
    },
  },
  google: {
    client_id: process.env.CB_GOOGLE_CLIENT_ID,
    client_secret: process.env.CB_GOOGLE_CLIENT_SECRET,
    redirect_url: "/google-auth",
  },
  teamRestricted: process.env.CB_RESTRICT_TEAMS,
  signupRestricted: process.env.CB_RESTRICT_SIGNUP,
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
