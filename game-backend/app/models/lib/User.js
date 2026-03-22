const mongoose = require('mongoose');

const User = new mongoose.Schema(
  {
    aPokerBoard: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    // sFullName: { type: String, default: '' },
    sUserName: { type: String, unique: true, default: '' },
    sEmail: { type: String, default: '' },
    // sMobile: { type: String },
    sDeviceId: { type: String, default: '' },
    sPassword: { type: String },
    eUserType: {
      type: String,
      enum: ['user', 'admin', 'bot', 'guest'],
      default: 'user',
    },
    sAvatar: { type: String, default: '' },
    // eLoginType: { type: String, enum: ['M', 'G', 'A', 'F'], default: 'M' },
    sRootSocket: { type: String, default: '' },
    eStatus: {
      type: String,
      enum: ['y', 'n', 'd'],
      default: 'y',
    },
    sToken: String,
    nChips: { type: Number, default: 10000 },
    isEmailVerified: { type: Boolean, default: false },
    // isMobileVerified: { type: Boolean, default: false },
    bVibrationEnabled: { type: Boolean, default: true },
    bSoundEnabled: { type: Boolean, default: true },
    bMusicEnabled: { type: Boolean, default: true },
    sVerificationToken: String,
    eGender: {
      type: String,
      enum: ['male', 'female', 'unspecified'],
      default: 'male',
    },
    sPushToken: { type: String, default: '' },
    dDob: Date,
    nWithdrawable: Number,
    nGameWon: { type: Number, default: 0 },
    nGamePlayed: { type: Number, default: 0 },
    nGameLost: { type: Number, default: 0 },
    sGoogleId: String,
    nDailyRewardStreak: { type: Number },
    dLastRewardClaimDate: { type: Date },
    sPrivateCode: String,
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

User.index([
  {
    key: { eStatus: 1 },
  },
]);

module.exports = mongoose.model('users', User);
