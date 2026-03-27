import dotenv from 'dotenv';

dotenv.config();

export function createConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 4000),
    databaseUrl: env.DATABASE_URL || '',
    jwtSecret: env.JWT_SECRET || 'dev-secret-change-me',
    esvApiKey: env.ESV_API_KEY || '',
    clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  };
}

export const config = createConfig();

export function validateConfig(input = config) {
  const missing = [];
  if (!input.databaseUrl) missing.push('DATABASE_URL');
  if (!input.jwtSecret || input.jwtSecret === 'dev-secret-change-me') missing.push('JWT_SECRET');
  if (!input.esvApiKey) missing.push('ESV_API_KEY');
  return missing;
}
