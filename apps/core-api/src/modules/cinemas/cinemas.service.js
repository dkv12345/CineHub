import * as cinemasRepository from './cinemas.repository.js';

const num = (d) => (d == null ? null : Number(d));

export async function listCinemas({ page, pageSize, chain, province }) {
  const where = {
    isActive: true,
    ...(chain ? { chain: { code: chain } } : {}),
    ...(province ? { province: { code: province } } : {}),
  };

  return cinemasRepository.findCinemasPage({ where, page, pageSize });
}

export const toCinemaDto = (c) => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  address: c.address,
  phone: c.phone,
  imageUrl: c.imageUrl,
  chain: { code: c.chain.code, name: c.chain.name },
  province: { code: c.province.code, name: c.province.name },
  ward: c.ward ? { name: c.ward.name } : null,
  location: { lat: num(c.latitude), lng: num(c.longitude) },
});
