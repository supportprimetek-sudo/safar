import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { getJwtSecret } from '../config/jwt';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, role, fullName, phone, vehicleTypeId, emergencyContact } = req.body;

    if (!email || !password || !role || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required registration fields' });
    }

    if (!['RIDER', 'DRIVER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role requested' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
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
      await prisma.riderProfile.create({
        data: {
          userId: user.id,
          emergencyContact: emergencyContact || null,
        },
      });
    } else if (role === 'DRIVER') {
      await prisma.driverProfile.create({
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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), {
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
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), {
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
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error during login' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
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

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { fullName, phone, emergencyContact, upiId } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName: fullName || undefined,
        phone: phone || undefined,
      },
    });

    if (req.user.role === 'RIDER' && emergencyContact) {
      await prisma.riderProfile.update({
        where: { userId: req.user.id },
        data: { emergencyContact },
      });
    }

    if (req.user.role === 'DRIVER' && upiId !== undefined) {
      await prisma.driverProfile.update({
        where: { userId: req.user.id },
        data: { upiId: upiId.trim() },
      }).catch(() => {});
    }

    return res.json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
