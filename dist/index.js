"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
const db_1 = require("./db");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Serve static uploads folder for profile photos
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
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
app.use('/api', api_1.default);
app.listen(Number(PORT), '0.0.0.0', async () => {
    const dbUrl = process.env.DATABASE_URL || '';
    let dbStatus = 'OFFLINE / UNKNOWN';
    try {
        await db_1.prisma.$connect();
        dbStatus = `CONNECTED (${dbUrl.includes('postgresql') ? 'PostgreSQL' : 'Database'})`;
    }
    catch (error) {
        dbStatus = `CONNECTION ERROR: ${error?.message || error}`;
    }
    console.log(`=================================================`);
    console.log(` FinLap Backend API Service is running on port ${PORT}`);
    console.log(` Database Status: ${dbStatus}`);
    console.log(` Local API:       http://localhost:${PORT}/api`);
    console.log(` Network API:     http://192.168.29.2:${PORT}/api`);
    console.log(`=================================================`);
});
