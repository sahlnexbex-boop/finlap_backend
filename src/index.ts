import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(` FinLap Backend API Service is running on port ${PORT}`);
  console.log(` Local:    http://localhost:${PORT}/api`);
  console.log(` Network:  http://192.168.29.2:${PORT}/api`);
  console.log(`=================================================`);
});
