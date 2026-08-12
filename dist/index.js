"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env as early as possible so modules that initialize on import
// (for example Prisma client) can read the DATABASE_URL value.
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = __importDefault(require("./routes/api"));
const db_1 = require("./db");
const path_1 = __importDefault(require("path"));
const reminderScheduler_1 = require("./services/reminderScheduler");
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
    // Log server and database status
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database status: ${dbStatus}`);
    // Start background notification scheduler
    (0, reminderScheduler_1.startReminderScheduler)();
});
exports.default = app;
