const DisputeStatus = {
  PENDING: 'pending',
  ESCALATED: 'escalated',
  WITHDRAWN: 'withdrawn',
  RESOLVED: 'resolved'
};

const PenaltyType = {
  NONE: 'none',
  WARNING: 'warning',
  SUSPENSION: 'suspension',
  BAN: 'ban'
};

const DisputeWinner = {
  RENTER: 'renter',
  OWNER: 'owner',
  NONE: 'none'
};

module.exports = { DisputeStatus, PenaltyType, DisputeWinner };
