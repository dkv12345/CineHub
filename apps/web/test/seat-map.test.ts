import { describe, expect, it } from 'vitest';
import { layoutForCinema } from '../src/components/SeatMap3D';

describe('3D seat layout simulation', () => {
  it('uses a generic 10-row layout with a central aisle by default', () => {
    expect(layoutForCinema('CineHub')).toMatchObject({
      rows: 10,
      columns: 16,
      aislesAfter: [8],
      vipFromRow: 6,
    });
  });

  it('preserves chain-specific simulated seat layouts', () => {
    expect(layoutForCinema('Galaxy Cinema')).toMatchObject({
      rows: 10,
      columns: 16,
      aislesAfter: [4, 12],
    });
    expect(layoutForCinema('Lotte Cinema')).toMatchObject({
      rows: 9,
      columns: 15,
      aislesAfter: [5, 10],
    });
  });
});
