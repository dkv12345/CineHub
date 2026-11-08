import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      default: 'MOMO',
    },
    status: {
      type: String,
      default: 'PENDING',
    },
    gatewayOrderId: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

export const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
