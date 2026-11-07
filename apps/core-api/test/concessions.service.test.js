import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findCinemaById: vi.fn(),
  findCinemaByExternalId: vi.fn(),
  findConcessions: vi.fn(),
}));

vi.mock('../src/modules/concessions/concessions.repository.js', () => ({
  findActiveCinemaById: mocks.findCinemaById,
  findActiveCinemaByExternalId: mocks.findCinemaByExternalId,
  findActiveConcessionsByChain: mocks.findConcessions,
}));

import {
  listConcessions,
  toConcessionDto,
} from '../src/modules/concessions/concessions.service.js';

describe('listConcessions', () => {
  it('filters cinema applicability and marks seat-count eligibility', async () => {
    mocks.findCinemaById.mockResolvedValue({ id: 'cinema-id', externalId: 'cinema-code' });
    mocks.findConcessions.mockResolvedValue([
      { id: 'global', cinemaId: null, cinemaApply: [], minSeats: 1, maxSeats: 6, sortOrder: 1 },
      {
        id: 'combo',
        cinemaId: null,
        cinemaApply: ['cinema-code'],
        minSeats: 2,
        maxSeats: 3,
        sortOrder: 2,
      },
      {
        id: 'other',
        cinemaId: null,
        cinemaApply: ['other-code'],
        minSeats: 1,
        maxSeats: 4,
        sortOrder: 3,
      },
      {
        id: 'local',
        cinemaId: 'another-cinema',
        cinemaApply: [],
        minSeats: 1,
        maxSeats: 4,
        sortOrder: 4,
      },
    ]);

    const rows = await listConcessions({
      chain: 'GALAXY',
      cinemaId: 'cinema-id',
      seats: 1,
    });
    const result = rows.map(toConcessionDto);

    expect(result.map((item) => item.id)).toEqual(['global', 'combo']);
    expect(result[0].eligible).toBe(true);
    expect(result[1].eligible).toBe(false);
  });
});
