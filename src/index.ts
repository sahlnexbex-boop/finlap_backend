import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { prisma } from './db';

import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static uploads folder for profile photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root health check
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'FinLap Premium Finance Tracker API Service',
    databaseUrl: process.env.DATABASE_URL || 'Not Configured',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', apiRouter);

app.listen(Number(PORT), '0.0.0.0', async () => {
  const dbUrl = process.env.DATABASE_URL || '';
  let dbStatus = 'OFFLINE / UNKNOWN';

  try {
    await prisma.$connect();
    dbStatus = `CONNECTED (${dbUrl.includes('postgresql') ? 'PostgreSQL' : 'Database'})`;
  } catch (error: any) {
    dbStatus = `CONNECTION ERROR: ${error?.message || error}`;
  }

  console.log(`=================================================`);
  console.log(` FinLap Backend API Service is running on port ${PORT}`);
  console.log(` Database Status: ${dbStatus}`);
  console.log(` Local API:       http://localhost:${PORT}/api`);
  console.log(` Network API:     http://192.168.29.2:${PORT}/api`);
  console.log(`=================================================`);
});

