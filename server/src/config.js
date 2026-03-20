import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  esvApiKey: process.env.ESV_API_KEY || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
