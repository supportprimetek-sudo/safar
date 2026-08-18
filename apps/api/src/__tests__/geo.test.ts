import { calculateDistanceKm, estimateDurationMinutes } from '../utils/geo';

describe('SAFAR Geo Calculations', () => {
  it('should calculate correct Haversine distance between two coordinates', () => {
    // Connaught Place to Cyber Hub Gurugram (~25-28 km)
    const distance = calculateDistanceKm(28.6139, 77.2090, 28.4950, 77.0890);
    expect(distance).toBeGreaterThan(20);
    expect(distance).toBeLessThan(35);
  });

  it('should estimate trip duration with minimum bounds', () => {
    const duration = estimateDurationMinutes(10, 30); // 10 km at 30 km/h = 20 mins
    expect(duration).toBe(20);

    const shortTripDuration = estimateDurationMinutes(0.2, 30); // Very short trip
    expect(shortTripDuration).toBe(3); // Min 3 mins
  });
});
