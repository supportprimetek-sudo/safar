import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SAFAR database seed...');

  // 1. Seed Vehicle Types
  const vehiclesData = [
    {
      name: 'Moto',
      description: 'Quick & affordable bike rides for single riders',
      icon: 'bike',
      image: '/vehicles/moto.png',
      baseFare: 25,
      perKmRate: 10,
      perMinuteRate: 1.5,
      minimumFare: 35,
      cancellationFee: 20,
      capacity: 1,
      isActive: true,
    },
    {
      name: 'Auto',
      description: 'Popular three-wheeler auto-rickshaws for short trips',
      icon: 'auto',
      image: '/vehicles/auto.png',
      baseFare: 35,
      perKmRate: 14,
      perMinuteRate: 2.0,
      minimumFare: 50,
      cancellationFee: 25,
      capacity: 3,
      isActive: true,
    },
    {
      name: 'Safar Go',
      description: 'Comfortable compact hatchbacks for everyday city travel',
      icon: 'car',
      image: '/vehicles/safar-go.png',
      baseFare: 50,
      perKmRate: 18,
      perMinuteRate: 2.5,
      minimumFare: 80,
      cancellationFee: 30,
      capacity: 4,
      isActive: true,
    },
    {
      name: 'Safar Sedan',
      description: 'Spacious sedans with extra legroom and air conditioning',
      icon: 'sedan',
      image: '/vehicles/safar-sedan.png',
      baseFare: 70,
      perKmRate: 22,
      perMinuteRate: 3.0,
      minimumFare: 110,
      cancellationFee: 40,
      capacity: 4,
      isActive: true,
    },
    {
      name: 'SUV',
      description: 'Premium 6-seater SUVs for family and airport trips',
      icon: 'suv',
      image: '/vehicles/suv.png',
      baseFare: 100,
      perKmRate: 28,
      perMinuteRate: 4.0,
      minimumFare: 150,
      cancellationFee: 50,
      capacity: 6,
      isActive: true,
    },
  ];

  const vehicleMap: Record<string, string> = {};

  for (const v of vehiclesData) {
    const created = await prisma.vehicleType.upsert({
      where: { name: v.name },
      update: v,
      create: v,
    });
    vehicleMap[v.name] = created.id;
    console.log(`✅ Vehicle Category created/updated: ${v.name}`);
  }

  // 2. Seed Default Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@safar.app' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      fullName: 'SAFAR System Admin',
      phone: '+919876543210',
    },
    create: {
      email: 'admin@safar.app',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      fullName: 'SAFAR System Admin',
      phone: '+919876543210',
      status: 'ACTIVE',
      isVerified: true,
    },
  });
  console.log(`👑 Admin user created: ${admin.email}`);

  // 3. Seed Default Rider
  const riderPasswordHash = await bcrypt.hash('Rider@123456', 10);
  const riderUser = await prisma.user.upsert({
    where: { email: 'rider@safar.app' },
    update: {
      passwordHash: riderPasswordHash,
      role: 'RIDER',
      fullName: 'Rahul Sharma',
      phone: '+919811223344',
    },
    create: {
      email: 'rider@safar.app',
      passwordHash: riderPasswordHash,
      role: 'RIDER',
      fullName: 'Rahul Sharma',
      phone: '+919811223344',
      status: 'ACTIVE',
      isVerified: true,
    },
  });

  await prisma.riderProfile.upsert({
    where: { userId: riderUser.id },
    update: { emergencyContact: '+919811223300' },
    create: { userId: riderUser.id, emergencyContact: '+919811223300' },
  });
  console.log(`🚗 Rider user created: ${riderUser.email}`);

  // 4. Seed Default Approved Online Drivers
  const driverPasswordHash = await bcrypt.hash('Driver@123456', 10);
  
  const driversList = [
    {
      email: 'driver.auto@safar.app',
      fullName: 'Vikram Singh',
      phone: '+919822334455',
      vehicleName: 'Auto',
      lat: 28.6139,
      lng: 77.2090,
    },
    {
      email: 'driver.moto@safar.app',
      fullName: 'Amit Kumar',
      phone: '+919833445566',
      vehicleName: 'Moto',
      lat: 28.6150,
      lng: 77.2110,
    },
    {
      email: 'driver.go@safar.app',
      fullName: 'Suresh Patel',
      phone: '+919844556677',
      vehicleName: 'Safar Go',
      lat: 28.6120,
      lng: 77.2050,
    },
  ];

  for (const d of driversList) {
    const driverUser = await prisma.user.upsert({
      where: { email: d.email },
      update: {
        passwordHash: driverPasswordHash,
        role: 'DRIVER',
        fullName: d.fullName,
        phone: d.phone,
      },
      create: {
        email: d.email,
        passwordHash: driverPasswordHash,
        role: 'DRIVER',
        fullName: d.fullName,
        phone: d.phone,
        status: 'ACTIVE',
        isVerified: true,
      },
    });

    const driverProf = await prisma.driverProfile.upsert({
      where: { userId: driverUser.id },
      update: {
        phone: d.phone,
        kycStatus: 'APPROVED',
        driverStatus: 'APPROVED',
        onlineStatus: 'ONLINE',
        vehicleTypeId: vehicleMap[d.vehicleName],
        currentLatitude: d.lat,
        currentLongitude: d.lng,
        lastLocationUpdate: new Date(),
        rating: 4.9,
        totalRides: 142,
      },
      create: {
        userId: driverUser.id,
        phone: d.phone,
        kycStatus: 'APPROVED',
        driverStatus: 'APPROVED',
        onlineStatus: 'ONLINE',
        vehicleTypeId: vehicleMap[d.vehicleName],
        currentLatitude: d.lat,
        currentLongitude: d.lng,
        lastLocationUpdate: new Date(),
        rating: 4.9,
        totalRides: 142,
      },
    });

    // Seed sample approved KYC docs
    await prisma.kycDocument.deleteMany({ where: { driverId: driverProf.id } });
    await prisma.kycDocument.createMany({
      data: [
        {
          driverId: driverProf.id,
          documentType: 'AADHAAR_FRONT',
          fileUrl: '/uploads/aadhaar_front.jpg',
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        },
        {
          driverId: driverProf.id,
          documentType: 'LICENCE_FRONT',
          fileUrl: '/uploads/licence_front.jpg',
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        },
      ],
    });

    console.log(`🚕 Driver user created: ${d.email} (${d.vehicleName})`);
  }

  // 5. System Settings Seed
  await prisma.systemSetting.upsert({
    where: { key: 'MAX_SEARCH_RADIUS_KM' },
    update: { value: '15' },
    create: { key: 'MAX_SEARCH_RADIUS_KM', value: '15', description: 'Maximum driver search radius in KM' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'REQUEST_TIMEOUT_SECONDS' },
    update: { value: '15' },
    create: { key: 'REQUEST_TIMEOUT_SECONDS', value: '15', description: 'Driver request response timeout' },
  });

  console.log('🎉 SAFAR Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
