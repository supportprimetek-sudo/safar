describe('SAFAR Fare Formula Logic', () => {
  const calculateFare = (baseFare: number, perKmRate: number, perMinuteRate: number, minimumFare: number, distanceKm: number, durationMinutes: number) => {
    const raw = baseFare + distanceKm * perKmRate + durationMinutes * perMinuteRate;
    return Math.round(Math.max(raw, minimumFare));
  };

  it('should calculate standard fare correctly', () => {
    // Moto: Base 25, 10/km, 1.5/min, min 35. 5 km, 10 mins -> 25 + 50 + 15 = 90
    const fare = calculateFare(25, 10, 1.5, 35, 5, 10);
    expect(fare).toBe(90);
  });

  it('should enforce minimum fare for short trips', () => {
    // Auto: Base 35, 14/km, 2/min, min 50. 0.5 km, 2 mins -> 35 + 7 + 4 = 46 -> minimum fare 50
    const fare = calculateFare(35, 14, 2, 50, 0.5, 2);
    expect(fare).toBe(50);
  });
});
