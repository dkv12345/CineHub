import { z } from 'zod';
import { paginationQuery } from '@cinehub/contracts';

export const listCinemasSchema = z.object({
  query: paginationQuery.extend({
    chain: z.string().optional(), // vd: GALAXY
    province: z.string().optional(), // vd: HCM
  }),
});
