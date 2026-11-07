import * as concessionsRepository from './concessions.repository.js';

export async function listConcessions({ chain, cinemaCode, cinemaId, seats }) {
  let selectedCinema = null;
  if (cinemaId) {
    selectedCinema = await concessionsRepository.findActiveCinemaById({ cinemaId, chain });
  } else if (cinemaCode) {
    selectedCinema = await concessionsRepository.findActiveCinemaByExternalId({
      cinemaCode,
      chain,
    });
  }

  const resolvedCinemaCode = selectedCinema?.externalId ?? cinemaCode;
  const rows = await concessionsRepository.findActiveConcessionsByChain(chain);

  return rows
    .filter((concession) => {
      if (cinemaId || cinemaCode) {
        if (concession.cinemaId && concession.cinemaId !== selectedCinema?.id) return false;
        const appliesTo = Array.isArray(concession.cinemaApply) ? concession.cinemaApply : [];
        if (appliesTo.length > 0 && !appliesTo.includes(resolvedCinemaCode)) return false;
      }
      return true;
    })
    .map((concession) => ({
      concession,
      eligible:
        seats === undefined || (concession.minSeats <= seats && seats <= concession.maxSeats),
    }));
}

export const toConcessionDto = ({ concession, eligible }) => ({
  id: concession.id,
  externalId: concession.externalId,
  name: concession.name,
  description: concession.description,
  category: concession.category,
  imageUrl: concession.imageUrl,
  price: concession.price,
  minSeats: concession.minSeats,
  maxSeats: concession.maxSeats,
  eligible,
});
