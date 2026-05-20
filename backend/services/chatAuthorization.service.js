const mongoose = require('mongoose');
const Rental = require('../models/Rental.model');

const isSameId = (left, right) => {
  if (!left || !right) return false;
  return left.toString() === right.toString();
};

const isRentalParticipant = (rental, userId) => (
  isSameId(rental?.renterId, userId) || isSameId(rental?.ownerId, userId)
);

const getRentalForChat = async (rentalId) => {
  if (!mongoose.Types.ObjectId.isValid(rentalId)) {
    return { error: { status: 400, message: 'ID don thue khong hop le' } };
  }

  const rental = await Rental.findById(rentalId);
  if (!rental) {
    return { error: { status: 404, message: 'Khong tim thay don thue' } };
  }

  return { rental };
};

const authorizeChatRead = async (rentalId, user) => {
  const { rental, error } = await getRentalForChat(rentalId);
  if (error) return { error };

  if (user?.role === 'admin' || isRentalParticipant(rental, user?._id)) {
    return { rental };
  }

  return { error: { status: 403, message: 'Ban khong co quyen xem hoi thoai nay' } };
};

const authorizeChatWrite = async (rentalId, user) => {
  const { rental, error } = await getRentalForChat(rentalId);
  if (error) return { error };

  if (isRentalParticipant(rental, user?._id)) {
    return { rental };
  }

  return { error: { status: 403, message: 'Ban khong co quyen tham gia hoi thoai nay' } };
};

module.exports = {
  authorizeChatRead,
  authorizeChatWrite,
  isRentalParticipant
};
