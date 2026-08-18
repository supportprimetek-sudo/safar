"use strict";
// SAFAR Shared Domain Types & Constants
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = void 0;
// Socket Events Definition
exports.SOCKET_EVENTS = {
    // Client -> Server
    DRIVER_ONLINE: 'driver_online',
    DRIVER_OFFLINE: 'driver_offline',
    DRIVER_LOCATION_UPDATE: 'driver_location_update',
    JOIN_RIDE_ROOM: 'join_ride_room',
    LEAVE_RIDE_ROOM: 'leave_ride_room',
    // Server -> Client
    RIDE_REQUESTED: 'ride_requested',
    RIDE_REQUEST_RECEIVED: 'ride_request_received',
    RIDE_ACCEPTED: 'ride_accepted',
    RIDE_REJECTED: 'ride_rejected',
    DRIVER_ARRIVING: 'driver_arriving',
    DRIVER_ARRIVED: 'driver_arrived',
    RIDE_STARTED: 'ride_started',
    RIDE_LOCATION_UPDATE: 'ride_location_update',
    RIDE_COMPLETED: 'ride_completed',
    RIDE_CANCELLED: 'ride_cancelled',
    PAYMENT_REQUESTED: 'payment_requested',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    NOTIFICATION_CREATED: 'notification_created',
    DRIVER_LOCATION_BROADCAST: 'driver_location_broadcast'
};
