const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    iUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nInAppTime: { type: Number, default: 0 },
    nInGameTime: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

analyticsSchema.index({ iUserId: 1, dCreatedDate: 1 });

module.exports = mongoose.model('analytics', analyticsSchema);
