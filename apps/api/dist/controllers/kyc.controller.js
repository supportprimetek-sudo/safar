"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadKycDocument = uploadKycDocument;
exports.getKycQueue = getKycQueue;
exports.approveKyc = approveKyc;
exports.rejectKyc = rejectKyc;
const prisma_1 = require("../config/prisma");
const socket_service_1 = require("../services/socket.service");
const shared_1 = require("@safar/shared");
async function uploadKycDocument(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Only drivers can upload KYC documents' });
        }
        const { documentType } = req.body;
        const file = req.file;
        if (!documentType || !file) {
            return res.status(400).json({ success: false, message: 'Document type and file are required' });
        }
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }
        const fileUrl = `/uploads/${file.filename}`;
        // Upsert document
        const existingDoc = await prisma_1.prisma.kycDocument.findFirst({
            where: { driverId: driverProfile.id, documentType },
        });
        let doc;
        if (existingDoc) {
            doc = await prisma_1.prisma.kycDocument.update({
                where: { id: existingDoc.id },
                data: {
                    fileUrl,
                    verificationStatus: 'PENDING',
                    uploadedAt: new Date(),
                    rejectionReason: null,
                },
            });
        }
        else {
            doc = await prisma_1.prisma.kycDocument.create({
                data: {
                    driverId: driverProfile.id,
                    documentType,
                    fileUrl,
                    verificationStatus: 'PENDING',
                },
            });
        }
        // Update driver KYC status to UNDER_REVIEW
        await prisma_1.prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: { kycStatus: 'UNDER_REVIEW' },
        });
        return res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getKycQueue(req, res) {
    try {
        const drivers = await prisma_1.prisma.driverProfile.findMany({
            where: {
                kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] },
            },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, phone: true, profileImage: true },
                },
                vehicleType: true,
                kycDocuments: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
        return res.json({ success: true, data: drivers });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function approveKyc(req, res) {
    try {
        const { driverId } = req.params;
        const driver = await prisma_1.prisma.driverProfile.update({
            where: { id: driverId },
            data: {
                kycStatus: 'APPROVED',
                driverStatus: 'APPROVED',
            },
            include: { user: true },
        });
        // Mark all docs approved
        await prisma_1.prisma.kycDocument.updateMany({
            where: { driverId },
            data: { verificationStatus: 'APPROVED', verifiedAt: new Date() },
        });
        // Create notification
        await prisma_1.prisma.notification.create({
            data: {
                userId: driver.userId,
                type: 'KYC_APPROVED',
                title: 'KYC Verification Approved 🎉',
                message: 'Your documents have been verified. You can now go ONLINE and accept ride requests!',
            },
        });
        // Socket notification
        try {
            (0, socket_service_1.getIO)().to(`user:${driver.userId}`).emit(shared_1.SOCKET_EVENTS.NOTIFICATION_CREATED, {
                title: 'KYC Verification Approved 🎉',
                message: 'You can now go ONLINE and accept ride requests!',
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Driver KYC approved', data: driver });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function rejectKyc(req, res) {
    try {
        const { driverId } = req.params;
        const { rejectionReason } = req.body;
        if (!rejectionReason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }
        const driver = await prisma_1.prisma.driverProfile.update({
            where: { id: driverId },
            data: {
                kycStatus: 'REJECTED',
                driverStatus: 'PENDING',
            },
            include: { user: true },
        });
        await prisma_1.prisma.kycDocument.updateMany({
            where: { driverId },
            data: { verificationStatus: 'REJECTED', rejectionReason },
        });
        await prisma_1.prisma.notification.create({
            data: {
                userId: driver.userId,
                type: 'KYC_REJECTED',
                title: 'KYC Documents Require Attention ⚠️',
                message: `Your KYC verification was rejected. Reason: ${rejectionReason}. Please re-upload clear documents.`,
            },
        });
        try {
            (0, socket_service_1.getIO)().to(`user:${driver.userId}`).emit(shared_1.SOCKET_EVENTS.NOTIFICATION_CREATED, {
                title: 'KYC Verification Rejected',
                message: `Reason: ${rejectionReason}`,
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Driver KYC rejected', data: driver });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
