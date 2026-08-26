import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

import { authenticateToken, requireRole } from './middleware/auth';
import { initializeSocketService } from './services/socket.service';

import * as authController from './controllers/auth.controller';
import * as vehicleController from './controllers/vehicle.controller';
import * as kycController from './controllers/kyc.controller';
import * as rideController from './controllers/ride.controller';
import * as driverController from './controllers/driver.controller';
import * as paymentController from './controllers/payment.controller';
import * as adminController from './controllers/admin.controller';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initializeSocketService(io);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', service: 'SAFAR Central API', timestamp: new Date().toISOString() });
});

// --- Auth Routes ---
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authenticateToken, authController.getMe);
app.put('/api/auth/profile', authenticateToken, authController.updateProfile);

// --- Vehicle Routes ---
app.get('/api/vehicles', vehicleController.listVehicles);
app.get('/api/admin/vehicles', authenticateToken, requireRole('ADMIN'), vehicleController.listAllVehiclesAdmin);
app.post('/api/admin/vehicles', authenticateToken, requireRole('ADMIN'), vehicleController.createVehicle);
app.put('/api/admin/vehicles/:id', authenticateToken, requireRole('ADMIN'), vehicleController.updateVehicle);
app.delete('/api/admin/vehicles/:id', authenticateToken, requireRole('ADMIN'), vehicleController.deleteVehicle);

// --- KYC Routes ---
app.post('/api/kyc/upload', authenticateToken, upload.single('document'), kycController.uploadKycDocument);
app.get('/api/admin/kyc/queue', authenticateToken, requireRole('ADMIN'), kycController.getKycQueue);
app.post('/api/admin/kyc/:driverId/approve', authenticateToken, requireRole('ADMIN'), kycController.approveKyc);
app.post('/api/admin/kyc/:driverId/reject', authenticateToken, requireRole('ADMIN'), kycController.rejectKyc);

// --- Driver Routes ---
app.post('/api/drivers/online', authenticateToken, driverController.toggleOnline);
app.post('/api/drivers/offline', authenticateToken, driverController.toggleOffline);
app.post('/api/drivers/location', authenticateToken, driverController.updateLocation);
app.get('/api/drivers/earnings', authenticateToken, driverController.getEarnings);
app.post('/api/drivers/payout', authenticateToken, driverController.requestPayout);
app.post('/api/drivers/payouts', authenticateToken, driverController.requestPayout);
app.post('/api/driver/payout', authenticateToken, driverController.requestPayout);
app.post('/api/payouts', authenticateToken, driverController.requestPayout);
app.post('/api/drivers/go-home-mode', authenticateToken, driverController.toggleGoHomeMode);

// --- Popular Destinations Routes (Must be declared before /api/rides/:id parameter route) ---
app.get('/api/rides/popular-destinations', adminController.getPopularDestinations);
app.get('/api/admin/popular-destinations', authenticateToken, requireRole('ADMIN'), adminController.getPopularDestinations);
app.post('/api/admin/popular-destinations', authenticateToken, requireRole('ADMIN'), adminController.createPopularDestination);
app.put('/api/admin/popular-destinations/:id', authenticateToken, requireRole('ADMIN'), adminController.updatePopularDestination);
app.delete('/api/admin/popular-destinations/:id', authenticateToken, requireRole('ADMIN'), adminController.deletePopularDestination);

// --- Ride Routes ---
app.get('/api/rides/track/:id', rideController.getPublicRideTrack); // Public Live Tracking
app.post('/api/rides/estimate-fare', rideController.estimateFare);
app.post('/api/rides', authenticateToken, rideController.createRide);
app.get('/api/rides/rider/history', authenticateToken, rideController.getRiderHistory);
app.get('/api/rides/driver/history', authenticateToken, rideController.getDriverHistory);
app.get('/api/rides/driver/active-request', authenticateToken, rideController.getActiveRideRequestForDriver);
app.get('/api/rides/:id', authenticateToken, rideController.getRideDetails);
app.get('/api/rides/:id/status', rideController.getRideStatusFallback); // Public fallback for polling
app.post('/api/rides/:id/accept', authenticateToken, rideController.acceptRide);
app.post('/api/rides/:id/arrived', authenticateToken, rideController.driverArrived);
app.post('/api/rides/:id/start', authenticateToken, rideController.startRide);
app.post('/api/rides/:id/complete', authenticateToken, rideController.completeRide);
app.post('/api/rides/:id/cancel', authenticateToken, rideController.cancelRide);
app.post('/api/rides/:id/sos', authenticateToken, rideController.triggerSosEmergency);

// --- Payment Routes ---
app.get('/api/rides/:id/payment', authenticateToken, paymentController.getPaymentInfo);
app.post('/api/rides/:id/payment/confirm', authenticateToken, paymentController.confirmPayment);

// --- Admin Dashboard Routes ---
app.get('/api/admin/dashboard', authenticateToken, requireRole('ADMIN'), adminController.getDashboardStats);
app.get('/api/admin/analytics', authenticateToken, requireRole('ADMIN'), adminController.getAnalyticsSummary);
app.get('/api/admin/live-map', authenticateToken, requireRole('ADMIN'), adminController.getLiveMapData);
app.get('/api/admin/drivers', authenticateToken, requireRole('ADMIN'), adminController.listDrivers);
app.get('/api/admin/riders', authenticateToken, requireRole('ADMIN'), adminController.listRiders);
app.get('/api/admin/rides', authenticateToken, requireRole('ADMIN'), adminController.listAllRides);
app.put('/api/admin/drivers/:driverId/status', authenticateToken, requireRole('ADMIN'), adminController.updateDriverStatus);
app.get('/api/admin/payouts', authenticateToken, requireRole('ADMIN'), adminController.listPayoutRequests);
app.get('/api/admin/payout-requests', authenticateToken, requireRole('ADMIN'), adminController.listPayoutRequests);
app.get('/api/admin/payout', authenticateToken, requireRole('ADMIN'), adminController.listPayoutRequests);
app.post('/api/admin/payouts/:id/approve', authenticateToken, requireRole('ADMIN'), adminController.approvePayoutRequest);
app.post('/api/admin/payout-requests/:id/approve', authenticateToken, requireRole('ADMIN'), adminController.approvePayoutRequest);
app.post('/api/admin/payout/:id/approve', authenticateToken, requireRole('ADMIN'), adminController.approvePayoutRequest);
app.post('/api/admin/payouts/:id/reject', authenticateToken, requireRole('ADMIN'), adminController.rejectPayoutRequest);
app.post('/api/admin/payout-requests/:id/reject', authenticateToken, requireRole('ADMIN'), adminController.rejectPayoutRequest);
app.post('/api/admin/payout/:id/reject', authenticateToken, requireRole('ADMIN'), adminController.rejectPayoutRequest);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SAFAR API & Realtime Server running on http://localhost:${PORT}`);
});
