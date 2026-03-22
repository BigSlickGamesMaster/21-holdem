const mongoose = require('mongoose');

const PokerBoardSchema = new mongoose.Schema(
  {
    iBoardId: { type: mongoose.Schema.Types.ObjectId },
    iProtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'board_prototypes' },
    aParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
    sPrivateCode: { type: String },
    eTableMode: { type: String, default: 'live' },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

module.exports = mongoose.model('poker_boards', PokerBoardSchema);
