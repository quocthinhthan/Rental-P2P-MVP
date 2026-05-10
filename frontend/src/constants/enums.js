export const ItemStatus = Object.freeze({
  AVAILABLE: 'available',
  RENTED: 'rented',
  DELISTED: 'delisted'
});

export const RentalStatus = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
});

export const PaymentStatus = Object.freeze({
  PENDING: 'pending',
  ESCROWED: 'escrowed',
  REFUNDED: 'refunded'
});

export const ItemStatusI18nKey = Object.freeze({
  [ItemStatus.AVAILABLE]: 'item.status.available',
  [ItemStatus.RENTED]: 'item.status.rented',
  [ItemStatus.DELISTED]: 'item.status.delisted'
});

export const RentalStatusI18nKey = Object.freeze({
  [RentalStatus.PENDING_PAYMENT]: 'rental.status.pending_payment',
  [RentalStatus.PENDING_CONFIRMATION]: 'rental.status.pending_confirmation',
  [RentalStatus.CONFIRMED]: 'rental.status.confirmed',
  [RentalStatus.REJECTED]: 'rental.status.rejected',
  [RentalStatus.IN_PROGRESS]: 'rental.status.in_progress',
  [RentalStatus.COMPLETED]: 'rental.status.completed',
  [RentalStatus.CANCELLED]: 'rental.status.cancelled'
});

export const PaymentStatusI18nKey = Object.freeze({
  [PaymentStatus.PENDING]: 'rental.paymentStatus.pending',
  [PaymentStatus.ESCROWED]: 'rental.paymentStatus.escrowed',
  [PaymentStatus.REFUNDED]: 'rental.paymentStatus.refunded'
});

export const getItemStatusI18nKey = (status) => (
  ItemStatusI18nKey[status] || 'item.status.unknown'
);

export const getRentalStatusI18nKey = (status) => (
  RentalStatusI18nKey[status] || 'rental.status.unknown'
);

export const getPaymentStatusI18nKey = (status) => (
  PaymentStatusI18nKey[status] || 'rental.paymentStatus.unknown'
);
