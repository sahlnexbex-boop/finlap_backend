import dotenv from 'dotenv';
// Load .env as early as possible so modules that initialize on import
// (for example Prisma client) can read the DATABASE_URL value.
dotenv.config();

import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import { prisma } from './db';
import path from 'path';
import { startReminderScheduler } from './services/reminderScheduler';


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
  
  // Log server and database status
  console.log(`Server is running on port ${PORT}`);
  console.log(`Database status: ${dbStatus}`);

  // Start background notification scheduler
  startReminderScheduler();
});


export default app;

