import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function listVehicles(req: Request, res: Response) {
  try {
    const vehicles = await prisma.vehicleType.findMany({
      where: { isActive: true },
      orderBy: { baseFare: 'asc' },
    });
    return res.json({ success: true, data: vehicles });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function listAllVehiclesAdmin(req: Request, res: Response) {
  try {
    const vehicles = await prisma.vehicleType.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: vehicles });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createVehicle(req: Request, res: Response) {
  try {
    const { name, description, icon, image, baseFare, perKmRate, perMinuteRate, minimumFare, cancellationFee, capacity } = req.body;

    if (!name || baseFare === undefined || perKmRate === undefined || perMinuteRate === undefined || minimumFare === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required vehicle fields' });
    }

    const vehicle = await prisma.vehicleType.create({
      data: {
        name,
        description: description || '',
        icon: icon || 'car',
        image: image || '/vehicles/default.png',
        baseFare: Number(baseFare),
        perKmRate: Number(perKmRate),
        perMinuteRate: Number(perMinuteRate),
        minimumFare: Number(minimumFare),
        cancellationFee: Number(cancellationFee || 20),
        capacity: Number(capacity || 4),
        isActive: true,
      },
    });

    return res.status(201).json({ success: true, message: 'Vehicle created', data: vehicle });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, icon, image, baseFare, perKmRate, perMinuteRate, minimumFare, cancellationFee, capacity, isActive } = req.body;

    const vehicle = await prisma.vehicleType.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        image,
        baseFare: baseFare !== undefined ? Number(baseFare) : undefined,
        perKmRate: perKmRate !== undefined ? Number(perKmRate) : undefined,
        perMinuteRate: perMinuteRate !== undefined ? Number(perMinuteRate) : undefined,
        minimumFare: minimumFare !== undefined ? Number(minimumFare) : undefined,
        cancellationFee: cancellationFee !== undefined ? Number(cancellationFee) : undefined,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return res.json({ success: true, message: 'Vehicle updated', data: vehicle });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.vehicleType.delete({ where: { id } });
    return res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
