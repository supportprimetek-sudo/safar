export type UserRole = 'RIDER' | 'DRIVER' | 'ADMIN';
export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type DriverAccountStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'BLOCKED';
export type DriverOnlineStatus = 'ONLINE' | 'OFFLINE';
export type RideStatus = 'REQUESTED' | 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'DRIVER_ACCEPTED' | 'DRIVER_ARRIVING' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'PAYMENT_PENDING' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'QR';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export interface User {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    phone: string;
    profileImage?: string | null;
    status: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string | null;
}
export interface RiderProfile {
    id: string;
    userId: string;
    emergencyContact?: string | null;
    user?: User;
}
export interface DriverProfile {
    id: string;
    userId: string;
    phone: string;
    profileImage?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    kycStatus: KycStatus;
    driverStatus: DriverAccountStatus;
    onlineStatus: DriverOnlineStatus;
    vehicleTypeId?: string | null;
    vehicleType?: VehicleType;
    currentLatitude?: number | null;
    currentLongitude?: number | null;
    lastLocationUpdate?: string | null;
    rating: number;
    totalRides: number;
    walletBalance?: number;
    upiId?: string | null;
    user?: User;
    kycDocuments?: KycDocument[];
}
export interface PayoutRequest {
    id: string;
    driverId: string;
    amount: number;
    upiId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    processedAt?: string | null;
}
export interface KycDocument {
    id: string;
    driverId: string;
    documentType: 'AADHAAR_FRONT' | 'AADHAAR_BACK' | 'LICENCE_FRONT' | 'LICENCE_BACK' | 'VEHICLE_RC' | 'INSURANCE';
    fileUrl: string;
    verificationStatus: KycStatus;
    uploadedAt: string;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
}
export interface VehicleType {
    id: string;
    name: string;
    description: string;
    icon: string;
    image: string;
    baseFare: number;
    perKmRate: number;
    perMinuteRate: number;
    minimumFare: number;
    cancellationFee: number;
    capacity: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Ride {
    id: string;
    riderId: string;
    driverId?: string | null;
    vehicleTypeId: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    destinationAddress: string;
    destinationLatitude: number;
    destinationLongitude: number;
    distanceKm: number;
    estimatedDurationMinutes: number;
    estimatedFare: number;
    finalFare?: number | null;
    rideStatus: RideStatus;
    requestedAt: string;
    acceptedAt?: string | null;
    driverArrivedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    cancelledAt?: string | null;
    cancellationReason?: string | null;
    otpCode?: string | null;
    rider?: User;
    driver?: DriverProfile;
    vehicleType?: VehicleType;
    payment?: Payment;
}
export interface RideLocation {
    id: string;
    rideId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
    timestamp: string;
}
export interface Payment {
    id: string;
    rideId: string;
    riderId: string;
    driverId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    qrReference?: string | null;
    confirmedBy?: string | null;
    confirmedAt?: string | null;
    createdAt: string;
}
export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any> | null;
    isRead: boolean;
    createdAt: string;
}
export interface FareEstimate {
    vehicleType: VehicleType;
    distanceKm: number;
    durationMinutes: number;
    estimatedFare: number;
    etaMinutes: number;
}
export interface DriverLocationPayload {
    driverId: string;
    rideId?: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    timestamp?: string;
}
export declare const SOCKET_EVENTS: {
    DRIVER_ONLINE: string;
    DRIVER_OFFLINE: string;
    DRIVER_LOCATION_UPDATE: string;
    JOIN_RIDE_ROOM: string;
    LEAVE_RIDE_ROOM: string;
    RIDE_REQUESTED: string;
    RIDE_REQUEST_RECEIVED: string;
    RIDE_ACCEPTED: string;
    RIDE_REJECTED: string;
    DRIVER_ARRIVING: string;
    DRIVER_ARRIVED: string;
    RIDE_STARTED: string;
    RIDE_LOCATION_UPDATE: string;
    RIDE_COMPLETED: string;
    RIDE_CANCELLED: string;
    PAYMENT_REQUESTED: string;
    PAYMENT_CONFIRMED: string;
    NOTIFICATION_CREATED: string;
    DRIVER_LOCATION_BROADCAST: string;
};
