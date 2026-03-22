const mongoose = require('mongoose');

const BoardProtoTypeSchema = new mongoose.Schema(
  {
    sName: String,
    nTurnTime: Number, // in second
    nMaxPlayer: { type: Number, default: 9 },
    nMinBuyIn: { type: Number, default: 0 },
    // nMaxBuyIn: { type: Number, default: 0 },
    // nMaxTableAmount: { type: Number, default: 0 },
    nMinBet: { type: Number, default: 0 },
    ePokerType: {
      type: String,
      enum: ['pokerJack'],
      default: 'pokerJack',
    },
    eStatus: {
      type: String,
      enum: ['y', 'n', 'd'],
      default: 'y',
    },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

module.exports = mongoose.model('board_prototypes', BoardProtoTypeSchema);
