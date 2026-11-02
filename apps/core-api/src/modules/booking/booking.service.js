import { AppError } from '../../platform/utils/errors.js';
import * as bookingRepository from './booking.repository.js';

export const BOOKING_MODULE_STATUS = 'planned';

/**
 * @planned TODO(booking-module): Implement seat hold, checkout, and ticket issuance business logic.
 */
export async function createSeatHold(_payload) {
  void bookingRepository;
  throw new AppError(
    501,
    'NOT_IMPLEMENTED',
    'Booking module is planned and not yet implemented in core-api (see ADR 0006)',
  );
}
