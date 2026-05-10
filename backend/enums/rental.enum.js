const RentalStatus = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
});

const PaymentStatus = Object.freeze({
  PENDING: 'pending',
  ESCROWED: 'escrowed',
  REFUNDED: 'refunded'
});

module.exports = {
  RentalStatus,
  PaymentStatus
};
