"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.updateProfile = updateProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const jwt_1 = require("../config/jwt");
async function register(req, res) {
    try {
        const { email, password, role, fullName, phone, vehicleTypeId, emergencyContact } = req.body;
        if (!email || !password || !role || !fullName || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required registration fields' });
        }
        if (!['RIDER', 'DRIVER'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role requested' });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                role,
                fullName,
                phone,
                status: 'ACTIVE',
                isVerified: true,
            },
        });
        if (role === 'RIDER') {
            await prisma_1.prisma.riderProfile.create({
                data: {
                    userId: user.id,
                    emergencyContact: emergencyContact || null,
                },
            });
        }
        else if (role === 'DRIVER') {
            await prisma_1.prisma.driverProfile.create({
                data: {
                    userId: user.id,
                    phone,
                    vehicleTypeId: vehicleTypeId || null,
                    kycStatus: 'PENDING',
                    driverStatus: 'PENDING',
                    onlineStatus: 'OFFLINE',
                },
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, (0, jwt_1.getJwtSecret)(), {
            expiresIn: '7d',
        });
        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName,
                    phone: user.phone,
                },
            },
        });
    }
    catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error during registration' });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                riderProfile: true,
                driverProfile: {
                    include: {
                        vehicleType: true,
                        kycDocuments: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        // Update last login
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, (0, jwt_1.getJwtSecret)(), {
            expiresIn: '7d',
        });
        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName,
                    phone: user.phone,
                    profileImage: user.profileImage,
                    riderProfile: user.riderProfile,
                    driverProfile: user.driverProfile,
                },
            },
        });
    }
    catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error during login' });
    }
}
async function getMe(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                role: true,
                fullName: true,
                phone: true,
                profileImage: true,
                status: true,
                isVerified: true,
                createdAt: true,
                riderProfile: true,
                driverProfile: {
                    include: {
                        vehicleType: true,
                        kycDocuments: true,
                    },
                },
            },
        });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        return res.json({ success: true, data: user });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function updateProfile(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { fullName, phone, emergencyContact } = req.body;
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                fullName: fullName || undefined,
                phone: phone || undefined,
            },
        });
        if (req.user.role === 'RIDER' && emergencyContact) {
            await prisma_1.prisma.riderProfile.update({
                where: { userId: req.user.id },
                data: { emergencyContact },
            });
        }
        return res.json({ success: true, message: 'Profile updated', data: updatedUser });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
