const { User } = require('../../models');
const { requestLimiter } = require('../../utils');

const middleware = {};
const authProject = {
  sUserName: true,
  sEmail: true,
  sDeviceId: true,
  sPassword: true,
  eUserType: true,
  sAvatar: true,
  sRootSocket: true,
  eStatus: true,
  sToken: true,
  nChips: true,
  isEmailVerified: true,
  bVibrationEnabled: true,
  bSoundEnabled: true,
  bMusicEnabled: true,
  sVerificationToken: true,
  eGender: true,
  sPushToken: true,
  dDob: true,
  nWithdrawable: true,
  nGameWon: true,
  nGamePlayed: true,
  nGameLost: true,
  sGoogleId: true,
  nDailyRewardStreak: true,
  dLastRewardClaimDate: true,
  aPokerBoard: true,
  sPrivateCode: true,
};

async function getAuthenticatedUserFromRequest(req, res) {
  const token = req.header('authorization');
  if (!token) {
    res.reply(messages.unauthorized());
    return null;
  }

  const decodedToken = _.decodeToken(token);
  if (!decodedToken) {
    res.reply(messages.unauthorized());
    return null;
  }

  const user = await User.findOne({ _id: decodedToken._id }, authProject).lean();
  if (!user) {
    res.reply(messages.custom.user_not_found);
    return null;
  }
  if (user.sToken !== token) {
    res.reply(messages.unauthorized());
    return null;
  }
  if (user.eStatus === 'd') {
    res.reply(messages.custom.user_deleted);
    return null;
  }
  if (user.eStatus === 'n') {
    res.reply(messages.custom.user_blocked);
    return null;
  }

  return user;
}

middleware.apiLimiter = (req, res, next) => {
  const params = {
    path: req.path,
    remoteAddress: req.sRemoteAddress || '127.0.0.1',
    maxRequestTime: 1000,
  };
  requestLimiter.setLimit(params, error => {
    if (error) return res.reply(messages.too_many_request());
    next();
  });
};

middleware.isAuthenticated = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUserFromRequest(req, res);
    if (!user) return;
    if (!user.isEmailVerified) return res.reply(messages.not_verified('Email ID'));

    req.user = user;
    next();
  } catch (error) {
    res.reply(messages.server_error(), error.toString());
  }
};

middleware.isGuestAuthenticated = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUserFromRequest(req, res);
    if (!user) return;
    if (user.eUserType !== 'guest') return res.reply(messages.unauthorized());

    req.user = user;
    next();
  } catch (error) {
    res.reply(messages.server_error(), error.toString());
  }
};

module.exports = middleware;
