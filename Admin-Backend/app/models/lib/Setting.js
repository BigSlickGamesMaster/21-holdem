const mongoose = require('mongoose');

const Setting = new mongoose.Schema({
  aDailyReward: [Number],
  aAvatar: [String],
  nRakeAmount: Number,
  aShop: [Object],
});

module.exports = mongoose.model('setting', Setting);
