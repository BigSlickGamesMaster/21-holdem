const mongoose = require('mongoose');

const StackemRun = new mongoose.Schema(
  {
    iUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      index: true,
      required: true,
    },
    sUserName: { type: String, default: 'Player' },
    eDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    eResult: {
      type: String,
      enum: ['board-sealed', 'bust', 'timeout'],
      required: true,
    },
    nScore: { type: Number, default: 0 },
    nAdjustedScore: { type: Number, default: 0, index: true },
    nBonusMultiplier: { type: Number, default: 1 },
    nSpareSeconds: { type: Number, default: 0, index: true },
    nLinesCompleted: { type: Number, default: 0, index: true },
    nTurns: { type: Number, default: 0 },
    nBuyIn: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

StackemRun.index({ nAdjustedScore: -1, nLinesCompleted: -1, dCreatedDate: -1 });

module.exports = mongoose.model('stackem_runs', StackemRun);
