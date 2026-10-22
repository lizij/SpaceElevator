import { BASE_TOWERS, STATION_TOWERS } from './station-layout';

type V3 = [number, number, number];
export const GUIDE_SPACING = { x: 14.4, z: 9.7 };

// Four vehicle guides enter three terminal towers. The rear tower carries two
// separate five-strand channels; no strand splits or shares a crown fitting.
export const CABLE_GUIDES = [-1, 1].flatMap(sx => [-1, 1].map(sz => ({
  x: sx * GUIDE_SPACING.x,
  z: sz * GUIDE_SPACING.z,
  tower: sz < 0 ? 0 : sx > 0 ? 1 : 2,
  tangent: sz < 0 ? -sx * 1.45 : 0,
  strandDirection: sz < 0 ? -1 : 1
})));

export function cableRoutes(terminal: number) {
  return CABLE_GUIDES.flatMap((guide, group) => Array.from({ length: 5 }, (_, i) => {
    const strand = i - 2, offset = strand * .31;
    const tangent = guide.tangent + guide.strandDirection * offset;
    const lower: V3 = [guide.x + offset, 90, guide.z];
    const upper: V3 = [guide.x + offset, terminal - 92, guide.z];
    return {
      group, strand, tower: guide.tower, radius: strand === 0 ? .13 : .055,
      base: BASE_TOWERS[guide.tower].at(tangent, 71.8),
      lower, upper,
      entry: STATION_TOWERS[guide.tower].at(tangent, terminal - 62),
      top: STATION_TOWERS[guide.tower].at(tangent, terminal + 132)
    };
  }));
}
