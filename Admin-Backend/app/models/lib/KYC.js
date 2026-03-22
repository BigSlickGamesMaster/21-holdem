const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const kycSchema = new mongoose.Schema(
  {
    iUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    oPan: {
      _id: false,
      sPan: { type: String, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
      eStatus: { type: String, enum: ['N', 'P', 'R', 'A'], default: 'N' },
      sImage: String,
      sRejectReason: String,
      dCreatedDate: { type: Date, default: new Date() },
      dUpdatedDate: { type: Date, default: new Date() },
      oVerifiedAt: {
        dActionedAt: { type: Date, default: new Date() },
        iAdminId: { type: mongoose.Schema.Types.ObjectId },
        sIP: { type: String },
        _id: false,
      },
    },
    oAadhaar: {
      _id: false,
      sAadhaar: { type: String }, // Add pattern if needed
      sFrontImage: String,
      sBackImage: String,
      eStatus: { type: String, enum: ['N', 'P', 'R', 'A'], default: 'N' },
      sRejectReason: String,
      dCreatedDate: { type: Date, default: new Date() },
      dUpdatedDate: { type: Date, default: new Date() },
      oVerifiedAt: {
        _id: false,
        dActionedAt: { type: Date, default: new Date() },
        iAdminId: { type: mongoose.Schema.Types.ObjectId },
        sIP: { type: String },
      },
    },
    // dCreatedDate: { type: Date, default: new Date() },
    // dUpdatedDate: { type: Date, default: new Date() },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

kycSchema.index({ 'oPan.sPan': 1, 'oAadhaar.sAadhaar': 1, dCreatedDate: 1 });

module.exports = mongoose.model('KYC', kycSchema);
