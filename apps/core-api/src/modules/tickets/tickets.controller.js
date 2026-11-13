import * as ticketsService from './tickets.service.js';

export async function scanTicket(req, res, next) {
  try {
    const { qrString } = req.body || {};
    const staffId = req.user?.id;

    const result = await ticketsService.checkInTicket({
      qrString,
      staffId,
    });

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
