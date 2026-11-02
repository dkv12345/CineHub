import * as concessionsRepository from './concessions.repository.js';

export async function listConcessions({ chain, cinemaCode }) {
  const [cinema, rows] = await Promise.all([
    cinemaCode ? concessionsRepository.findActiveCinemaByExternalId({ cinemaCode, chain }) : null,
    concessionsRepository.findActiveConcessionsByChain(chain),
  ]);

  return rows.filter((concession) => {
    if (cinemaCode) {
      if (concession.cinemaId && concession.cinemaId !== cinema?.id) return false;
      const appliesTo = Array.isArray(concession.cinemaApply) ? concession.cinemaApply : [];
      if (appliesTo.length > 0 && !appliesTo.includes(cinemaCode)) return false;
    }
    return true;
  });
}

export const toConcessionDto = (concession) => ({
  id: concession.id,
  externalId: concession.externalId,
  name: concession.name,
  description: concession.description,
  category: concession.category,
  imageUrl: concession.imageUrl,
  price: concession.price,
  minSeats: concession.minSeats,
  maxSeats: concession.maxSeats,
  sortOrder: concession.sortOrder,
});
