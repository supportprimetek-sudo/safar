"use strict";
// Distance calculation utility using Haversine formula
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistanceKm = calculateDistanceKm;
exports.estimateDurationMinutes = estimateDurationMinutes;
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // 2 decimal places
}
function toRad(degrees) {
    return (degrees * Math.PI) / 180;
}
function estimateDurationMinutes(distanceKm, averageSpeedKmH = 30) {
    const hours = distanceKm / averageSpeedKmH;
    const minutes = Math.ceil(hours * 60);
    return Math.max(minutes, 3); // Minimum 3 minutes
}
