"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(` FinLap Backend API Service is running on port ${PORT}`);
    console.log(` Local:    http://localhost:${PORT}/api`);
    console.log(` Network:  http://192.168.29.2:${PORT}/api`);
    console.log(`=================================================`);
});
