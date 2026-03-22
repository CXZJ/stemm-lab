/** Earth gravity m/s² */
export const G = 9.81;

/** Approximate final velocity from drop height (no air resistance) m/s */
export function finalVelocityFromHeight(heightM: number): number {
  if (heightM <= 0) return 0;
  return Math.sqrt(2 * G * heightM);
}

/** Average acceleration from rest over distance: v² = 2 a d → a = v²/2d */
export function accelerationFromVelocityDistance(v: number, d: number): number {
  if (d <= 0) return 0;
  return (v * v) / (2 * d);
}

/** Net force F = m a (N) */
export function netForce(massKg: number, accelMs2: number): number {
  return massKg * accelMs2;
}

/** Drag estimate: F_drag ≈ m(g - a) when falling at terminal-ish average */
export function dragForceEstimate(
  massKg: number,
  gravity: number,
  measuredAccel: number,
): number {
  return Math.max(0, massKg * (gravity - measuredAccel));
}

/** Stopping g-force from speed change over time: a/g */
export function gForceFromStop(deltaVMs: number, deltaTS: number): number {
  if (deltaTS <= 0) return 0;
  const a = Math.abs(deltaVMs) / deltaTS;
  return a / G;
}

/** Relative stiffness proxy: angle per unit “force proxy” (1/distance) */
export function fanStiffnessProxy(angleDeg: number, distanceCm: number): number {
  if (distanceCm <= 0) return 0;
  return angleDeg * (distanceCm / 15);
}
