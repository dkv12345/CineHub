import { describe, expect, it, vi } from 'vitest';
import { CineHubGeneratedApiClient } from '../src/index';

describe('CineHubGeneratedApiClient', () => {
  it('routes requests to the underlying executor with query parameters', async () => {
    const executor = vi.fn().mockResolvedValue({ data: [] });
    const client = new CineHubGeneratedApiClient(executor);

    await client.listCinemas({ chain: 'GALAXY', province: 'HCM' });

    expect(executor).toHaveBeenCalledWith('GET', '/api/v1/cinemas?chain=GALAXY&province=HCM');
  });

  it('calls booking status endpoint', async () => {
    const executor = vi.fn().mockResolvedValue({ module: 'booking', status: 'planned' });
    const client = new CineHubGeneratedApiClient(executor);

    const res = await client.getBookingModuleStatus();
    expect(res).toEqual({ module: 'booking', status: 'planned' });
    expect(executor).toHaveBeenCalledWith('GET', '/api/v1/booking/status');
  });
});
