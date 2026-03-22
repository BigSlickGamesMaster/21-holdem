const mongoose = require('mongoose');

const PokerFinishGame = new mongoose.Schema(
  {
    iBoardId: mongoose.Schema.Types.ObjectId,
    iProtoId: mongoose.Schema.Types.ObjectId,
    nTableRound: Number,
    nGameRound: Number,
    nMaxPlayer: Number,
    nMinBet: Number,
    eState: String,
    ePokerType: String,
    nTableChips: Number,
    aCommunityCard: [],
    sPrivateCode: String,
    iDealerId: mongoose.Schema.Types.ObjectId,
    iSmallBlindId: mongoose.Schema.Types.ObjectId,
    iBigBlindId: mongoose.Schema.Types.ObjectId,
    nRakeAmount: Number, // in percentage
    aParticipant: [
      {
        _id: false,
        iUserId: mongoose.Schema.Types.ObjectId,
        sEmail: String,
        sUserName: String,
        nChips: Number,
        eState: String,
        nTurnMissed: Number,
        nWinningAmount: Number,
        aCardHand: [],
        nCardScore: Number,
        isDoubleDownLock: Boolean,
        nLastBidChips: Number,
        nStandAtRound: Number,
      },
    ],
    aLog: [],
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

PokerFinishGame.index({ iProtoId: 1 });

module.exports = mongoose.model('pokerfinishgame', PokerFinishGame);
