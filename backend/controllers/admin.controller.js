// backend/controllers/admin.controller.js
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');
const Dispute = require('../models/Dispute.model');
const Review = require('../models/Review.model');
const ItemReport = require('../models/ItemReport.model');
const AuditLog = require('../models/AuditLog.model');
const { ItemStatus } = require('../enums/item.enum');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum');
const { DisputeStatus } = require('../enums/dispute.enum');
const { ItemReportStatus, ItemReportAction } = require('../models/ItemReport.model');

const MAX_LIMIT = 100;
const DASHBOARD_RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value, defaultValue, max = MAX_LIMIT) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, max);
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const createAuditLog = async ({ req, action, targetType, targetId, before, after, reason = '', metadata = {} }) => {
  await AuditLog.create({
    actorId: req.user._id,
    action,
    targetType,
    targetId,
    before,
    after,
    reason,
    metadata
  });
};

const getDateRange = (range) => {
  const days = DASHBOARD_RANGES[range] || DASHBOARD_RANGES['7d'];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  return { days, startDate };
};

const normalizeDateBuckets = (days, values, valueKey) => {
  const map = values.reduce((acc, item) => {
    acc[item._id] = item[valueKey] || 0;
    return acc;
  }, {});

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      [valueKey]: map[key] || 0
    };
  });
};

const countByStatus = async (Model, field = 'status') => {
  const rows = await Model.aggregate([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } }
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id || 'unknown'] = row.count;
    return acc;
  }, {});
};

const findActiveRentalForItem = (itemId) => Rental.findOne({
  itemId,
  status: {
    $in: [
      RentalStatus.PENDING_CONFIRMATION,
      RentalStatus.CONFIRMED,
      RentalStatus.IN_PROGRESS,
      RentalStatus.DISPUTED
    ]
  }
}).select('_id status');

// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
  const { isBanned } = req.body;

  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: 'User ID khong hop le' });
    }

    if (typeof isBanned !== 'boolean') {
      return res.status(400).json({ message: 'isBanned phai la boolean' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const before = { isBanned: user.isBanned };
    user.isBanned = isBanned;
    await user.save();

    await createAuditLog({
      req,
      action: 'admin.user.update_status',
      targetType: 'User',
      targetId: user._id,
      before,
      after: { isBanned: user.isBanned }
    });

    res.status(200).json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/dashboard/overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalItems,
      itemStatusCounts,
      rentalStatusCounts,
      financeRows,
      heldDepositRows,
      totalDisputes,
      disputeStatusCounts,
      bannedUsers
    ] = await Promise.all([
      User.countDocuments({}),
      Item.countDocuments({}),
      countByStatus(Item),
      countByStatus(Rental),
      Rental.aggregate([
        {
          $group: {
            _id: null,
            rentalFee: { $sum: { $ifNull: ['$rentalFee', 0] } },
            commissionAmount: { $sum: { $ifNull: ['$commissionAmount', 0] } }
          }
        }
      ]),
      Rental.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.ESCROWED,
            status: { $in: [RentalStatus.PENDING_CONFIRMATION, RentalStatus.CONFIRMED, RentalStatus.IN_PROGRESS, RentalStatus.DISPUTED] }
          }
        },
        { $group: { _id: null, depositAmount: { $sum: { $ifNull: ['$depositAmount', 0] } } } }
      ]),
      Dispute.countDocuments({}),
      countByStatus(Dispute),
      User.countDocuments({ isBanned: true })
    ]);

    res.status(200).json({
      users: {
        total: totalUsers,
        banned: bannedUsers
      },
      items: {
        total: totalItems,
        available: itemStatusCounts[ItemStatus.AVAILABLE] || 0,
        rented: itemStatusCounts[ItemStatus.RENTED] || 0,
        delisted: itemStatusCounts[ItemStatus.DELISTED] || 0,
        byStatus: itemStatusCounts
      },
      rentals: {
        total: Object.values(rentalStatusCounts).reduce((sum, count) => sum + count, 0),
        byStatus: rentalStatusCounts
      },
      finance: {
        rentalFee: financeRows[0]?.rentalFee || 0,
        commissionAmount: financeRows[0]?.commissionAmount || 0,
        heldDepositAmount: heldDepositRows[0]?.depositAmount || 0
      },
      disputes: {
        total: totalDisputes,
        escalated: disputeStatusCounts[DisputeStatus.ESCALATED] || 0,
        resolved: disputeStatusCounts[DisputeStatus.RESOLVED] || 0,
        byStatus: disputeStatusCounts
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/dashboard/charts?range=7d|30d|90d
exports.getDashboardCharts = async (req, res) => {
  try {
    const { days, startDate } = getDateRange(req.query.range);
    const byDayProject = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [rentalsByDay, revenueByDay, usersByDay, disputesByDay] = await Promise.all([
      Rental.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: byDayProject, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Rental.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: byDayProject, rentalFee: { $sum: { $ifNull: ['$rentalFee', 0] } } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: byDayProject, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Dispute.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: byDayProject, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      range: req.query.range && DASHBOARD_RANGES[req.query.range] ? req.query.range : '7d',
      rentalsByDay: normalizeDateBuckets(days, rentalsByDay, 'count'),
      revenueByDay: normalizeDateBuckets(days, revenueByDay, 'rentalFee'),
      usersByDay: normalizeDateBuckets(days, usersByDay, 'count'),
      disputesByDay: normalizeDateBuckets(days, disputesByDay, 'count')
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/dashboard/top-items?limit=10
exports.getTopItems = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 10);
    const rows = await Rental.aggregate([
      {
        $group: {
          _id: '$itemId',
          rentalCount: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$rentalFee', 0] } },
          rentalIds: { $addToSet: '$_id' }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item'
        }
      },
      { $unwind: '$item' },
      {
        $lookup: {
          from: 'disputes',
          localField: 'rentalIds',
          foreignField: 'rentalId',
          as: 'disputes'
        }
      },
      {
        $project: {
          _id: '$item._id',
          code: '$item.code',
          name: '$item.name',
          category: '$item.category',
          status: '$item.status',
          pricePerDay: '$item.pricePerDay',
          mainImage: { $arrayElemAt: ['$item.images', 0] },
          ownerId: '$item.ownerId',
          rentalCount: 1,
          revenue: 1,
          disputeCount: { $size: '$disputes' }
        }
      },
      { $sort: { rentalCount: -1, revenue: -1, disputeCount: -1 } },
      { $limit: limit }
    ]);

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/dashboard/top-users?limit=10&type=owners|renters|risky
exports.getTopUsers = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 10);
    const type = ['owners', 'renters', 'risky'].includes(req.query.type) ? req.query.type : 'owners';
    const sort = type === 'renters'
      ? { renterRentalCount: -1, disputeCount: -1 }
      : type === 'risky'
        ? { isBanned: -1, disputeCount: -1, trustScore: 1 }
        : { ownerRentalCount: -1, itemCount: -1 };

    const users = await User.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'items'
        }
      },
      {
        $lookup: {
          from: 'rentals',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'ownerRentals'
        }
      },
      {
        $lookup: {
          from: 'rentals',
          localField: '_id',
          foreignField: 'renterId',
          as: 'renterRentals'
        }
      },
      {
        $lookup: {
          from: 'disputes',
          localField: '_id',
          foreignField: 'reporterId',
          as: 'reportedDisputes'
        }
      },
      {
        $lookup: {
          from: 'disputes',
          localField: 'ownerRentals._id',
          foreignField: 'rentalId',
          as: 'ownerDisputes'
        }
      },
      {
        $lookup: {
          from: 'disputes',
          localField: 'renterRentals._id',
          foreignField: 'rentalId',
          as: 'renterDisputes'
        }
      },
      {
        $addFields: {
          itemCount: { $size: '$items' },
          ownerRentalCount: { $size: '$ownerRentals' },
          renterRentalCount: { $size: '$renterRentals' },
          disputeCount: {
            $size: {
              $setUnion: [
                '$reportedDisputes._id',
                '$ownerDisputes._id',
                '$renterDisputes._id'
              ]
            }
          }
        }
      },
      {
        $match: type === 'owners'
          ? { $or: [{ itemCount: { $gt: 0 } }, { ownerRentalCount: { $gt: 0 } }] }
          : type === 'renters'
            ? { renterRentalCount: { $gt: 0 } }
            : { $or: [{ disputeCount: { $gt: 0 } }, { isBanned: true }, { trustScore: { $lt: 3 } }] }
      },
      {
        $project: {
          password: 0,
          items: 0,
          ownerRentals: 0,
          renterRentals: 0,
          reportedDisputes: 0,
          ownerDisputes: 0,
          renterDisputes: 0,
          idCardImages: 0,
          resetPasswordToken: 0,
          resetPasswordExpire: 0
        }
      },
      { $sort: sort },
      { $limit: limit }
    ]);

    res.status(200).json({ type, users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/items?page=1&limit=20&status=&category=&search=&ownerId=&ownerSearch=
exports.getAdminItems = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 10000);
    const limit = parsePositiveInt(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const match = {};

    if (req.query.status) {
      if (!Object.values(ItemStatus).includes(req.query.status)) {
        return res.status(400).json({ message: 'Trang thai item khong hop le' });
      }
      match.status = req.query.status;
    }

    if (req.query.category) {
      match.category = { $regex: escapeRegex(req.query.category.trim()), $options: 'i' };
    }

    if (req.query.search) {
      match.name = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    }

    if (req.query.ownerId) {
      if (!isObjectId(req.query.ownerId)) {
        return res.status(400).json({ message: 'Owner ID khong hop le' });
      }
      match.ownerId = toObjectId(req.query.ownerId);
    }

    const ownerSearch = req.query.ownerSearch?.trim() || '';

    // Common lookup stages (used in both data and count pipelines)
    const ownerLookup = [
      { $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    ];

    const ownerMatchStage = ownerSearch ? [{
      $match: {
        $or: [
          { 'owner.fullName': { $regex: escapeRegex(ownerSearch), $options: 'i' } },
          { 'owner.email': { $regex: escapeRegex(ownerSearch), $options: 'i' } }
        ]
      }
    }] : [];

    const projectStage = {
      $project: {
        code: 1, name: 1, description: 1, category: 1, images: 1, pricePerDay: 1,
        baseValue: 1, depositPercentage: 1, address: 1, status: 1,
        isFeatured: 1, createdAt: 1, updatedAt: 1,
        rentalCount: { $size: '$rentals' },
        disputeCount: { $size: '$disputes' },
        owner: {
          _id: '$owner._id', fullName: '$owner.fullName', email: '$owner.email',
          phoneNumber: '$owner.phoneNumber', avatarUrl: '$owner.avatarUrl',
          trustScore: '$owner.trustScore', isBanned: '$owner.isBanned'
        }
      }
    };

    const [items, countRows] = await Promise.all([
      Item.aggregate([
        { $match: match },
        ...ownerLookup,
        ...ownerMatchStage,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'rentals', localField: '_id', foreignField: 'itemId', as: 'rentals' } },
        { $lookup: { from: 'disputes', localField: 'rentals._id', foreignField: 'rentalId', as: 'disputes' } },
        projectStage,
      ]),
      ownerSearch
        ? Item.aggregate([
          { $match: match },
          ...ownerLookup,
          ...ownerMatchStage,
          { $count: 'total' }
        ])
        : Item.countDocuments(match).then((n) => [{ total: n }])
    ]);

    const total = (Array.isArray(countRows) ? countRows[0]?.total : countRows) || 0;

    res.status(200).json({
      items,
      pagination: {
        currentPage: page,
        limitPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/items/:id

exports.getAdminItemDetail = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Item ID khong hop le' });
    }

    const item = await Item.findById(req.params.id).populate('ownerId', '-password');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const [rentals, reports] = await Promise.all([
      Rental.find({ itemId: item._id })
        .sort({ createdAt: -1 })
        .populate('renterId', 'fullName email phoneNumber trustScore isBanned')
        .populate('ownerId', 'fullName email phoneNumber trustScore isBanned'),
      ItemReport.find({ itemId: item._id })
        .sort({ createdAt: -1 })
        .populate('reporterId', 'fullName email phoneNumber trustScore isBanned')
        .populate('resolvedBy', 'fullName email')
    ]);

    const rentalIds = rentals.map((rental) => rental._id);
    const [disputes, reviews, financeRows] = await Promise.all([
      Dispute.find({ rentalId: { $in: rentalIds } })
        .sort({ createdAt: -1 })
        .populate('reporterId', 'fullName email phoneNumber trustScore isBanned')
        .populate('resolvedBy', 'fullName email'),
      Review.find({ rentalId: { $in: rentalIds } })
        .sort({ createdAt: -1 })
        .populate('reviewerId', 'fullName email avatarUrl')
        .populate('revieweeId', 'fullName email avatarUrl'),
      Rental.aggregate([
        { $match: { itemId: item._id } },
        {
          $group: {
            _id: null,
            rentalCount: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$rentalFee', 0] } },
            commissionAmount: { $sum: { $ifNull: ['$commissionAmount', 0] } },
            depositAmount: { $sum: { $ifNull: ['$depositAmount', 0] } }
          }
        }
      ])
    ]);

    res.status(200).json({
      item,
      owner: item.ownerId,
      rentals,
      disputes,
      reviews,
      reports,
      stats: {
        rentalCount: financeRows[0]?.rentalCount || 0,
        disputeCount: disputes.length,
        reviewCount: reviews.length,
        reportCount: reports.length,
        revenue: financeRows[0]?.revenue || 0,
        commissionAmount: financeRows[0]?.commissionAmount || 0,
        depositAmount: financeRows[0]?.depositAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /api/admin/items/:id/status
exports.updateItemStatus = async (req, res) => {
  const { status, reason = '' } = req.body;

  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Item ID khong hop le' });
    }

    if (!Object.values(ItemStatus).includes(status)) {
      return res.status(400).json({ message: 'Trang thai item khong hop le' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (status !== ItemStatus.RENTED) {
      const activeRental = await findActiveRentalForItem(item._id);
      if (activeRental) {
        return res.status(400).json({
          message: 'Khong the doi item dang co don thue active sang trang thai nay',
          activeRental
        });
      }
    }

    const before = { status: item.status };
    item.status = status;
    await item.save();

    await createAuditLog({
      req,
      action: 'admin.item.update_status',
      targetType: 'Item',
      targetId: item._id,
      before,
      after: { status: item.status },
      reason
    });

    res.status(200).json({ message: 'Item status updated', item });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /api/admin/items/:id/feature
exports.updateItemFeature = async (req, res) => {
  const { isFeatured } = req.body;

  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Item ID khong hop le' });
    }

    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({ message: 'isFeatured phai la boolean' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const before = { isFeatured: item.isFeatured };
    item.isFeatured = isFeatured;
    await item.save();

    await createAuditLog({
      req,
      action: 'admin.item.update_feature',
      targetType: 'Item',
      targetId: item._id,
      before,
      after: { isFeatured: item.isFeatured }
    });

    res.status(200).json({ message: 'Item feature updated', item });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/item-reports
exports.getItemReports = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 10000);
    const limit = parsePositiveInt(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.status) {
      if (!Object.values(ItemReportStatus).includes(req.query.status)) {
        return res.status(400).json({ message: 'Trang thai report khong hop le' });
      }
      filter.status = req.query.status;
    }

    const [reports, total] = await Promise.all([
      ItemReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporterId', 'fullName email phoneNumber trustScore isBanned')
        .populate('resolvedBy', 'fullName email')
        .populate({
          path: 'itemId',
          populate: { path: 'ownerId', select: 'fullName email phoneNumber trustScore isBanned' }
        }),
      ItemReport.countDocuments(filter)
    ]);

    res.status(200).json({
      reports,
      pagination: {
        currentPage: page,
        limitPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /api/admin/item-reports/:reportId/resolve
exports.resolveItemReport = async (req, res) => {
  const { action, resolutionNote = '' } = req.body;

  try {
    if (!isObjectId(req.params.reportId)) {
      return res.status(400).json({ message: 'Report ID khong hop le' });
    }

    if (!Object.values(ItemReportAction).includes(action)) {
      return res.status(400).json({ message: 'Action xu ly report khong hop le' });
    }

    const report = await ItemReport.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status === ItemReportStatus.RESOLVED) {
      return res.status(400).json({ message: 'Report nay da duoc xu ly' });
    }

    const item = await Item.findById(report.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const owner = await User.findById(item.ownerId);
    const before = {
      reportStatus: report.status,
      itemStatus: item.status,
      ownerTrustScore: owner?.trustScore,
      ownerIsBanned: owner?.isBanned
    };

    if ([ItemReportAction.HIDE_ITEM, ItemReportAction.DELIST_ITEM, ItemReportAction.BAN_ITEM].includes(action)) {
      const activeRental = await findActiveRentalForItem(item._id);
      if (activeRental) {
        return res.status(400).json({
          message: 'Khong the an hoac go item dang co don thue active',
          activeRental
        });
      }

      item.status = ItemStatus.DELISTED;
      await item.save();
    }

    if (action === ItemReportAction.WARN_OWNER && owner) {
      owner.trustScore = Math.max(-100, (owner.trustScore || 0) - 10);
      await owner.save();
    }

    if (action === ItemReportAction.BAN_ITEM && owner) {
      owner.trustScore = Math.max(-100, (owner.trustScore || 0) - 30);
      await owner.save();
    }

    report.status = ItemReportStatus.RESOLVED;
    report.action = action;
    report.resolutionNote = resolutionNote;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    await createAuditLog({
      req,
      action: 'admin.item_report.resolve',
      targetType: 'ItemReport',
      targetId: report._id,
      before,
      after: {
        reportStatus: report.status,
        action: report.action,
        itemStatus: item.status,
        ownerTrustScore: owner?.trustScore,
        ownerIsBanned: owner?.isBanned
      },
      reason: resolutionNote,
      metadata: { itemId: item._id }
    });

    res.status(200).json({ message: 'Item report resolved', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
