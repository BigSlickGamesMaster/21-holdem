const mongoose = require('mongoose');

const Transaction = new mongoose.Schema(
  {
    iUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'users' },
    iBoardId: { type: mongoose.Schema.Types.ObjectId, ref: 'boards' },
    iProductId: { type: mongoose.Schema.Types.ObjectId },
    sPurchaseToken: { type: String },
    nPreviousChips: { type: Number },
    nNewChips: { type: Number },
    nAmount: { type: Number, default: 0 },
    dExecuteDate: { type: Date, default: Date.now },
    eProductRewardType: { type: String },
    ePlatform: { type: String, enum: ['Android', 'iOS'] },
    sIP: { type: String },
    orderId: { type: String },
    sRemarks: { type: String },
    nGameRound: { type: Number },
    sSquareTransactionId: { type: String }, // only for square transaction
    // Keeping some fields from the original model for backward compatibility
    iDoneBy: mongoose.Schema.Types.ObjectId,
    sDescription: String,
    eType: {
      type: String,
      enum: ['debit', 'credit', 'failed'],
      default: 'credit',
    },
    eMode: {
      type: String,
      enum: ['admin', 'user', 'game', 'IAP', 'DR', 'manual', 'square'],
      default: 'game',
    },
    eStatus: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

Transaction.index({ iUserId: 1, dCreatedDate: 1 });

module.exports = mongoose.model('transaction', Transaction);
