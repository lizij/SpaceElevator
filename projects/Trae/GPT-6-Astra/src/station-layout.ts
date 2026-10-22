type V3 = [number, number, number];

// One shared frame for each tower, its cladding, fittings and transfer bridges.
// Local X is tangential; positive local Z points away from the central spindle.
function towerFrames(radius: number) { return Array.from({ length: 3 }, (_, i) => {
  const angle = i * Math.PI * 2 / 3 - Math.PI / 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    angle,
    rotation: [0, Math.PI / 2 - angle, 0] as V3,
    at(tangent: number, y: number, radial = 0): V3 {
      return [c * (radius + radial) + s * tangent, y, s * (radius + radial) - c * tangent];
    }
  };
}); }

export const STATION_TOWERS = towerFrames(17);
export const BASE_TOWERS = towerFrames(26);
