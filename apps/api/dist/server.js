"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_1 = require("./middleware/auth");
const socket_service_1 = require("./services/socket.service");
const authController = __importStar(require("./controllers/auth.controller"));
const vehicleController = __importStar(require("./controllers/vehicle.controller"));
const kycController = __importStar(require("./controllers/kyc.controller"));
const rideController = __importStar(require("./controllers/ride.controller"));
const driverController = __importStar(require("./controllers/driver.controller"));
const paymentController = __importStar(require("./controllers/payment.controller"));
const adminController = __importStar(require("./controllers/admin.controller"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
(0, socket_service_1.initializeSocketService)(io);
// Ensure uploads folder exists
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Multer storage engine
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
// Global Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(uploadsDir));
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', service: 'SAFAR Central API', timestamp: new Date().toISOString() });
});
// --- Auth Routes ---
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', auth_1.authenticateToken, authController.getMe);
app.put('/api/auth/profile', auth_1.authenticateToken, authController.updateProfile);
// --- Vehicle Routes ---
app.get('/api/vehicles', vehicleController.listVehicles);
app.get('/api/admin/vehicles', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), vehicleController.listAllVehiclesAdmin);
app.post('/api/admin/vehicles', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), vehicleController.createVehicle);
app.put('/api/admin/vehicles/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), vehicleController.updateVehicle);
app.delete('/api/admin/vehicles/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), vehicleController.deleteVehicle);
// --- KYC Routes ---
app.post('/api/kyc/upload', auth_1.authenticateToken, upload.single('document'), kycController.uploadKycDocument);
app.get('/api/admin/kyc/queue', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), kycController.getKycQueue);
app.post('/api/admin/kyc/:driverId/approve', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), kycController.approveKyc);
app.post('/api/admin/kyc/:driverId/reject', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), kycController.rejectKyc);
// --- Driver Routes ---
app.post('/api/drivers/online', auth_1.authenticateToken, driverController.toggleOnline);
app.post('/api/drivers/offline', auth_1.authenticateToken, driverController.toggleOffline);
app.post('/api/drivers/location', auth_1.authenticateToken, driverController.updateLocation);
app.get('/api/drivers/earnings', auth_1.authenticateToken, driverController.getEarnings);
// --- Popular Destinations Routes (Must be declared before /api/rides/:id parameter route) ---
app.get('/api/rides/popular-destinations', adminController.getPopularDestinations);
app.get('/api/admin/popular-destinations', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.getPopularDestinations);
app.post('/api/admin/popular-destinations', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.createPopularDestination);
app.put('/api/admin/popular-destinations/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.updatePopularDestination);
app.delete('/api/admin/popular-destinations/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.deletePopularDestination);
// --- Ride Routes ---
app.post('/api/rides/estimate-fare', rideController.estimateFare);
app.post('/api/rides', auth_1.authenticateToken, rideController.createRide);
app.get('/api/rides/rider/history', auth_1.authenticateToken, rideController.getRiderHistory);
app.get('/api/rides/driver/history', auth_1.authenticateToken, rideController.getDriverHistory);
app.get('/api/rides/:id', auth_1.authenticateToken, rideController.getRideDetails);
app.get('/api/rides/:id/status', rideController.getRideStatusFallback); // Public fallback for polling
app.post('/api/rides/:id/accept', auth_1.authenticateToken, rideController.acceptRide);
app.post('/api/rides/:id/arrived', auth_1.authenticateToken, rideController.driverArrived);
app.post('/api/rides/:id/start', auth_1.authenticateToken, rideController.startRide);
app.post('/api/rides/:id/complete', auth_1.authenticateToken, rideController.completeRide);
app.post('/api/rides/:id/cancel', auth_1.authenticateToken, rideController.cancelRide);
// --- Payment Routes ---
app.get('/api/rides/:id/payment', auth_1.authenticateToken, paymentController.getPaymentInfo);
app.post('/api/rides/:id/payment/confirm', auth_1.authenticateToken, paymentController.confirmPayment);
// --- Admin Dashboard Routes ---
app.get('/api/admin/dashboard', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.getDashboardStats);
app.get('/api/admin/live-map', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.getLiveMapData);
app.get('/api/admin/drivers', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.listDrivers);
app.get('/api/admin/riders', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.listRiders);
app.get('/api/admin/rides', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.listAllRides);
app.put('/api/admin/drivers/:driverId/status', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), adminController.updateDriverStatus);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 SAFAR API & Realtime Server running on http://localhost:${PORT}`);
});
