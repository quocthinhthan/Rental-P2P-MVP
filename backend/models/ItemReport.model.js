const mongoose = require('mongoose');

const ItemReportStatus = Object.freeze({
  PENDING: 'pending',
  RESOLVED: 'resolved'
});

const ItemReportAction = Object.freeze({
  NO_ACTION: 'no_action',
  HIDE_ITEM: 'hide_item',
  DELIST_ITEM: 'delist_item',
  BAN_ITEM: 'ban_item',
  WARN_OWNER: 'warn_owner'
});

const ItemReportSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  evidenceImages: [{ type: String }],
  status: {
    type: String,
    enum: Object.values(ItemReportStatus),
    default: ItemReportStatus.PENDING
  },
  action: {
    type: String,
    enum: Object.values(ItemReportAction),
    default: null
  },
  resolutionNote: { type: String, default: '' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

ItemReportSchema.index({ itemId: 1, createdAt: -1 });
ItemReportSchema.index({ reporterId: 1, createdAt: -1 });
ItemReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ItemReport', ItemReportSchema);
module.exports.ItemReportStatus = ItemReportStatus;
module.exports.ItemReportAction = ItemReportAction;
