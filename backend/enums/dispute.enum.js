const DisputeStatus = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

const PenaltyType = {
  NONE: 'none',
  WARNING: 'warning',
  SUSPENSION: 'suspension',
  BAN: 'ban'
};

module.exports = { DisputeStatus, PenaltyType };