const { User, Setting } = require('../../../../models');

const controllers = {};

controllers.get = async (req, res) => {
  try {
    const userResponse = { ...req.user };
    delete userResponse.sToken;
    delete userResponse.sPassword;
    delete userResponse.sVerificationToken;
    const aAvatar = await Setting.findOne({}, { _id: false, aAvatar: true });

    return res.reply(messages.success(), { ...userResponse, aAvatar });
  } catch (error) {
    console.log(`🚀 ~ file: controllers.js:33 ~ controllers.get= ~ error:`, error);
    res.reply(messages.server_error('profile::'), error);
  }
};
controllers.updateProfile = async (req, res) => {
  try {
    const data = _.pick(req.body, ['sAvatar', 'sUserName']);
    const query = {};

    if (data.sAvatar) query.sAvatar = data.sAvatar;
    if (data.sUserName) {
      const existUser = await User.findOne(
        {
          sUserName: { $regex: new RegExp(`^${data.sUserName}$`, 'i') }, // Case-insensitive match
        },
        { sUserName: 1 }
      );
      if (existUser) return res.reply(messages.already_exists('Username'));
      query.sUserName = data.sUserName;
    }

    await User.updateOne({ _id: req.user._id }, { $set: query });
    return res.reply(messages.successfully('Profile updated'));
  } catch (error) {
    log.red(`🚀 ~ file: controllers.js:66 ~ controllers.updateProfile= ~ error:`, error);
    res.reply(messages.server_error(), error);
  }
};
controllers.logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $unset: { sToken: true } });
    res.reply(messages.success());
  } catch (error) {
    res.reply(messages.server_error(), error);
  }
};
controllers.deleteAccount = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.user._id, eUserType: 'user' }, { $set: { eStatus: 'd' }, sToken: '' });
    if (!user) return res.reply(messages.not_found('user'));

    return res.reply(messages.successfully('Account Deleted'));
  } catch (error) {
    return res.reply(messages.server_error(), error);
  }
};
controllers.addCash = async (req, res) => {
  try {
    const data = _.pick(req.body, ['nChips']);

    await User.updateOne({ _id: req.user._id }, { $inc: { nChips: data.nChips } });

    await Transaction.create({
      iUserId: req.user._id,
      nAmount: data.nChips,
      eType: 'credit',
      eMode: 'user',
      eStatus: 'Success',
    });
    return res.reply(messages.successfully('Cash added'));
  } catch (error) {
    log.red(` ~ file: controllers.js:29 ~ controllers.avatarSend= ~ error:`, error);
    res.reply(messages.server_error(), error);
  }
};

controllers.userSetting = async (req, res) => {
  try {
    const data = _.pick(req.body, ['bVibrationEnabled', 'bSoundEnabled', 'bMusicEnabled']);
    const query = {};

    if ([true, false].includes(data.bVibrationEnabled)) query.bVibrationEnabled = data.bVibrationEnabled;
    if ([true, false].includes(data.bSoundEnabled)) query.bSoundEnabled = data.bSoundEnabled;
    if ([true, false].includes(data.bMusicEnabled)) query.bMusicEnabled = data.bMusicEnabled;

    await User.updateOne({ _id: req.user._id }, { $set: query });
    return res.reply(messages.success());
  } catch (error) {
    console.log(`controllers.userSetting= ~ error:`, error);
    res.reply(messages.server_error(), error);
  }
};

// controllers.playerStatus = async (req, res) => {
//   try {
//     const body = _.pick(req.body, ['status']);
//     if (!body.status) return res.reply(messages.required_field('status'));

//     const user = await User.findOne({ _id: req.user._id }, { ePlayerStatus: true });
//     if (!user) return res.reply(messages.not_found('User'));

//     user.ePlayerStatus = body.status;
//     await user.save();

//     return res.reply(messages.success(), user);
//   } catch (error) {
//     log.red(`🚀 ~ file: controllers.js:98 ~ controllers.playerStatus= ~ error:`, error);
//     return res.reply(messages.server_error(), error);
//   }
// };

// controllers.avatarSend = async (req, res) => {
//   try {
//     const user = await User.findOne({ _id: req.user._id });
//     if (!user) return res.reply(message.not_found('User'));
//     const setting = await Setting.findOne({}, { aAvatar: true });
//     return res.reply(messages.success(), { setting, userAvatarData: user.aAvatar });
//   } catch (error) {
//     log.red(`��� ~ file: controllers.js:29 ~ controllers.avatarSend= ~ error:`, error);
//     res.reply(messages.server_error(), error);
//   }
// };

// controllers.avatarUnlock = async (req, res) => {
//   try {
//     const { nIndex } = req.body;
//     const user = await User.findOne({ _id: req.user._id, aAvatar: { $elemMatch: { nIndex } } }).lean();
//     if (!user) {
//       return res.reply(messages.not_found('user'));
//     }
//     const avatar = user.aAvatar[nIndex - 1];
//     if (avatar.unlocked) {
//       return res.reply(messages.inactive('Avatar is already unlocked'));
//     }
//     if (user.nChips < avatar.price) {
//       return res.reply(messages.insufficient_chips());
//     }

//     const result = await User.updateOne(
//       { _id: req.user._id, 'aAvatar.nIndex': nIndex },
//       {
//         $set: { 'aAvatar.$.unlocked': true },
//         $inc: { nChips: -avatar.price },
//       }
//     );

//     return res.reply(messages.successfully('Avatar unlock'), { remainingChips: user.nChips - avatar.price });
//   } catch (error) {
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };
// controllers.avtarSelect = async (req, res) => {
//   const { nIndex } = req.body;

//   const user = await User.findOne({ _id: req.user._id, aAvatar: { $elemMatch: { nIndex } } }).lean();
//   if (!user) {
//     return res.reply(messages.not_found('user'));
//   }
//   const avatar = user.aAvatar[nIndex - 1];
//   if (!avatar.unlocked) {
//     return res.reply(messages.no_prefix('Avatar is locked'));
//   }

//   const setting = await Setting.findOne({}).lean();
//   const avatr = await User.updateOne({ _id: req.user._id }, { $set: { sCurrentAvatar: setting.aAvatar[nIndex - 1], nCurrentAvatarIndex: nIndex } });
//   return res.reply(messages.successfully('Avatar updated'));
// };

// controllers.userSetting = async (req, res) => {
//   try {
//     const data = _.pick(req.body, ['bVibrationEnabled', 'bSoundEnabled', 'bMusicEnabled']);
//     const query = {};

//     if (['true', 'false'].includes(data.bVibrationEnabled)) query.bVibrationEnabled = data.bVibrationEnabled;
//     if (['true', 'false'].includes(data.bSoundEnabled)) query.bSoundEnabled = data.bSoundEnabled;
//     if (['true', 'false'].includes(data.bMusicEnabled)) query.bMusicEnabled = data.bMusicEnabled;

//     await User.updateOne({ _id: req.user._id }, { $set: query });
//     return res.reply(messages.success());
//   } catch (error) {
//     log.red(`🚀 ~ file: controllers.js:49 ~ controllers.userSetting= ~ error:`, error);
//     res.reply(messages.server_error(), error);
//   }
// };
// controllers.addProto = async (req, res) => {
//   try {
//     const body = _.pick(req.body, ['nBoardFee', 'sName', 'nMaxPlayer', 'aWinningAmount', 'eBoardType', 'nGameType']);
//     if (!body.nBoardFee) return res.reply(messages.required_field('nBoardFee'));
//     if (!body.sName) return res.reply(messages.required_field('board Name'));
//     if (!body.aWinningAmount) return res.reply(messages.required_field('Winning Amount'));
//     await BoardProtoType.create(body);
//     res.reply(messages.success('add proto'));
//   } catch (error) {
//     log.red(`🚀 ~ file: controllers.js:80 ~ controllers.addProto= ~ error:`, error);
//     res.reply(messages.server_error(), error);
//   }
// };
// controllers.addKYC = async (req, res) => {
//   try {
//     const body = _.pick(req.body, ['sFrontImage', 'sBackImage', 'sAadhaar', 'sPan', 'sImage', 'sType']);
//     //     export const eDocType = {
//     //     PAN: 'pan',
//     //     AADHAAR: 'aadhaar',
//     // } as const;
//     if (!body.sFrontImage) return res.reply(messages.required_field('Document Type'));
//     if (!body.sBackImage) return res.reply(messages.required_field('Document Number'));
//     if (!body.sAadhaar) return res.reply(messages.required_field('ID Expiry Date'));
//     if (!body.sPan) return res.reply(messages.required_field('Document Front Image'));
//     if (!body.sType) return res.reply(messages.required_field('Document Back Image'));

//     const iUserId = req.user._id;
//     let { sFrontImage, sBackImage, sAadhaar, sPan, sImage, sType } = body;

//     if (sType == 'aadhaar' && (!sFrontImage || !sBackImage)) return res.reply(messages.required_field('Front & back images'));
//     // { res: { error: 'Front & back images' }, msg: 'INVALID_BODY' };

//     if (sType == 'pan' && !sImage) return res.reply(messages.required_field('Pan images'));

//     let query = {};

//     if (sType == 'aadhaar') query = { 'oAadhaar.sAadhaar': sAadhaar, iUserId: { $ne: iUserId }, 'oAadhaar.eStatus': { $ne: 'R' } };
//     else query = { 'oPan.sPan': sPan, iUserId: { $ne: iUserId }, 'oPan.eStatus': { $ne: 'R' } };

//     const numberExist = await KYC.findOne(query);
//     if (numberExist) return res.reply(messages.already_exists('aadhaar or PAN Exist'));

//     let data;
//     if (sType == 'aadhaar') {
//       data = {
//         iUserId,
//         oAadhaar: {
//           sFrontImage,
//           sBackImage,
//           eStatus: 'P',
//           sAadhaar,
//           dCreatedDate: new Date(),
//         },
//       };
//     }

//     if (sType == 'pan') {
//       data = {
//         iUserId,
//         oPan: {
//           sImage,
//           eStatus: 'P',
//           sPan,
//           dCreatedDate: new Date(),
//         },
//       };
//     }
//     const kyc = await KYC.findOne({ iUserId: data?.iUserId });
//     if (kyc) KYC.updateOne({ iUserId: data?.iUserId }, { $set: { ...data, dUpdatedDate: new Date() } });
//     else {
//       await KYC.insertOne(KYCData);
//     }
//     return res.reply(messages.successfully('KYC_ADDED'));
//   } catch (error) {
//     log.red('Very Bad 🚀 ~ file: controllers.js:119 ~ controllers.addKYC :::', error);
//     return res.reply(messages.server_error(), error);
//   }
// };
// controllers.presignURL = async (req, res) => {
//   try {
//     let { sFileName, sContentType } = req.body;

//     const valid = _.checkValidImageType(sFileName, sContentType);
//     if (!valid) return res.reply(messages.not_valid('MEDIA_TYPE'));

//     const user = await User.findOne({ _id: req.user._id }, { projection: { sUsername: 1 } });
//     if (!user) return res.reply(messages.custom.user_not_found);

//     sFileName = `Date_Ludo_${user._id}_${Date.now()}_${sFileName}`;
//     const sPath = `profile/${user._id}/`;

//     const data = await awsServices.createSignedURL(sFileName, sContentType, sPath, true, process.env.S3_BUCKET);

//     return res.reply(messages.success(''), { ...data });
//   } catch (error) {
//     log.red(`🚀 ~ file: controllers.js:183 ~ controllers.presignURL= ~ error:`, error);
//     return res.reply(messages.server_error(), error);
//   }
// };

module.exports = controllers;
