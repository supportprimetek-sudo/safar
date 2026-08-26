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
    user?: User;
    kycDocuments?: KycDocument[];
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
    readonly DRIVER_ONLINE: "driver_online";
    readonly DRIVER_OFFLINE: "driver_offline";
    readonly DRIVER_LOCATION_UPDATE: "driver_location_update";
    readonly JOIN_RIDE_ROOM: "join_ride_room";
    readonly LEAVE_RIDE_ROOM: "leave_ride_room";
    readonly RIDE_REQUESTED: "ride_requested";
    readonly RIDE_REQUEST_RECEIVED: "ride_request_received";
    readonly RIDE_ACCEPTED: "ride_accepted";
    readonly RIDE_REJECTED: "ride_rejected";
    readonly DRIVER_ARRIVING: "driver_arriving";
    readonly DRIVER_ARRIVED: "driver_arrived";
    readonly RIDE_STARTED: "ride_started";
    readonly RIDE_LOCATION_UPDATE: "ride_location_update";
    readonly RIDE_COMPLETED: "ride_completed";
    readonly RIDE_CANCELLED: "ride_cancelled";
    readonly PAYMENT_REQUESTED: "payment_requested";
    readonly PAYMENT_CONFIRMED: "payment_confirmed";
    readonly NOTIFICATION_CREATED: "notification_created";
    readonly DRIVER_LOCATION_BROADCAST: "driver_location_broadcast";
    readonly CHAT_SEND_MESSAGE: "chat_send_message";
    readonly CHAT_NEW_MESSAGE: "chat_new_message";
};
