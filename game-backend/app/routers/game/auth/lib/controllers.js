const { User } = require('../../../../models');
const { OAuth2Client } = require('google-auth-library');
const { fakeUser, firebase } = require('../../../../utils');
const axios = require('axios');
const nodemailer = require('../../../../utils/lib/nodemailer');

const controllers = {};

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
controllers.login = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sMobile', 'iReferredBy']);
    let socialDetails = {};

    if (!body.sMobile) return res.reply(messages.required_field('mobile number'));
    if (_.validateMobile(body.sMobile)) return res.reply(messages.not_valid('Mobile number is'));

    const query = { sMobile: body.sMobile, eStatus: { $ne: 'd' } };
    const project = {
      _id: true,
      isMobileVerified: true,
      eStatus: true,
      sToken: true,
      eUserType: true,
      sMobile: true,
      sDeviceId: true,
      sEmail: true,
    };

    let user = await User.findOne(query, project);
    if (req.headers.socialtoken) {
      const decodedSocialToken = _.verifyToken(req.headers.socialtoken);
      if (!decodedSocialToken) return res.reply(messages.unauthorized());
      if (decodedSocialToken.sGoogleId) {
        socialDetails.sUserName = decodedSocialToken.sUserName;
        socialDetails.sEmail = decodedSocialToken.sEmail;
        socialDetails.sGoogleId = decodedSocialToken.sGoogleId;
        socialDetails.eLoginType = decodedSocialToken.eLoginType;
        socialDetails.eUserType = decodedSocialToken.eUserType;
        socialDetails.sDeviceId = decodedSocialToken.sDeviceId;
      }
      const userExists = await User.findOne({ sMobile: body.sMobile, sEmail: { $ne: '' } });
      if (userExists) return res.reply(messages.custom.already_exists_mobile);
    }

    const deviceData = _.pick(req.body, ['oDeviceInfo']);
    try {
      deviceData.oDeviceInfo = JSON.parse(deviceData.oDeviceInfo);
    } catch (e) {
      deviceData.oDeviceInfo = {};
    }
    if (!user) {
      let newUser = {
        sMobile: body.sMobile,
        eUserType: socialDetails.eUserType,
        nOTP: process.env.NODE_ENV !== 'prod' ? 1234 : _.salt(4),
        sUserName: fakeUser.getRandomUserName(),
        isNewUser: true,
      };

      if (req.headers.socialtoken) {
        // newUser.sEmail = socialDetails.sEmail;
        newUser.eLoginType = socialDetails.eLoginType;
        newUser.sGoogleId = socialDetails.sGoogleId;
        newUser.sUserName = socialDetails.sUserName;
      }

      newUser.sVerificationToken = _.encodeToken(
        { nOTP: newUser.nOTP, sMobile: newUser.sMobile, sDeviceId: deviceData.oDeviceInfo.sDeviceId, sEmail: socialDetails.sEmail },
        { expiresIn: '1m' }
      );

      newUser.sDeviceId = deviceData.oDeviceInfo.sDeviceId;

      // newUser.sReferralCode = _.sortid();
      const _user = new User(newUser);
      await _user.save();

      // await textGuru.sendOTP(_user.sMobile, _user.nOTP);

      // await OperationLog.create({
      //   iUserId: _user._id,
      //   sOperation: 'register',
      //   sRemoteAddress: req.sRemoteAddress,
      //   oDeviceInfo: deviceData.oDeviceInfo,
      // });
      return res.reply(
        messages.custom.login_otp_success,
        { nExpiresIn: 3 * 60 * 1000, sMobile: newUser.sMobile, nOTP: newUser.nOTP },
        { verification: newUser.sVerificationToken, nExpiresIn: 1 * 60 * 1000, sMessage: 'Otp has been sent successfully' }
      );
    }
    //if (req.headers.socialtoken && user?.sEmail.length) return res.reply(messages.custom.already_exists_mobile);

    // if (!user?.sEmail !== '') return res.reply(messages.custom.already_exists_mobile);
    // if (!user?.sMobile) return res.reply(messages.already_exists('Mobile'));
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    user.nOTP = process.env.NODE_ENV !== 'prod' ? 1234 : _.salt(4);

    user.sVerificationToken = _.encodeToken(
      { nOTP: user.nOTP, sMobile: user.sMobile, sDeviceId: deviceData.oDeviceInfo.sDeviceId, sEmail: socialDetails.sEmail },
      { expiresIn: '1m' }
    );
    user.sDeviceId = deviceData.oDeviceInfo.sDeviceId;
    user.eLoginType = 'M';
    if (req.headers.socialtoken) {
      if (socialDetails.sGoogleId) {
        // user.sEmail = socialDetails.sEmail;
        user.sUserName = socialDetails.sUserName;
        user.sGoogleId = socialDetails.sGoogleId;
        user.eLoginType = 'G';
      }
      // user.sProfilePic = socialDetails.sProfilePic;
    }
    await user.save();
    //await msg91.sendOTP(msg91.loggingNewDevice, { sMobile: user.sMobile, nOTP: user.nOTP });
    // await textGuru.sendOTP(user.sMobile, user.nOTP);
    // await OperationLog.create({
    //   iUserId: user._id,
    //   sOperation: 'simpleLogin',
    //   sRemoteAddress: req.sRemoteAddress,
    //   oDeviceInfo: deviceData.oDeviceInfo,
    // });
    return res.reply(
      messages.custom.login_otp_success,
      { nExpiresIn: 3 * 60 * 1000, sMobile: user.sMobile, nOTP: body.nOTP },
      { verification: user.sVerificationToken, nExpiresIn: 1 * 60 * 1000, sMessage: 'Otp has been sent successfully' }
    );
  } catch (error) {
    console.log('🚀 :: controllers.login= :: error:', error);
    log.red('Very Bad 🚀 ~ file: controllers.js:135 ~ controllers.login= ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};
controllers.verifyOtp = async (req, res) => {
  try {
    const body = _.pick(req.body, ['code', 'sMobile', 'sPushToken']);
    const token = req.header('verification');
    if (!token) return res.reply(messages.unauthorized());

    const decodedToken = _.verifyToken(token);

    if (!decodedToken || decodedToken === 'jwt expired') return res.reply(messages.expired('OTP'));

    if (Number(body.code) !== decodedToken.nOTP) return res.reply(messages.wrong_otp());
    const query = { sMobile: decodedToken.sMobile, eUserType: 'user', eStatus: { $ne: 'd' } };
    const project = {
      _id: true,
      nOTP: true,
      sMobile: true,
      eStatus: true,
      sVerificationToken: true,
      isMobileVerified: true,
      sToken: true,
      sUserName: true,
      sDeviceId: true,
      sPushToken: true,
      aPokerBoard: true,
    };

    const deviceData = _.pick(req.body, ['oDeviceInfo']);
    try {
      deviceData.oDeviceInfo = JSON.parse(deviceData.oDeviceInfo);
    } catch (e) {
      deviceData.oDeviceInfo = {};
    }

    const user = await User.findOne(query, project);
    if (!user) return res.reply(messages.custom.user_not_found);
    if (user.nOTP !== decodedToken.nOTP) return res.reply(messages.wrong_otp());
    if (user.sVerificationToken !== token) return res.reply(messages.unauthorized());
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    if (user.sPushToken !== body.sPushToken) user.sPushToken = body.sPushToken;
    if (user.aPokerBoard.length) {
      emitter.emit('reqLeave', { sEventName: 'reqLeave', iBoardId: user.aPokerBoard[0].toString(), iUserId: user._id.toString() });
    }

    //await msg91.verifyOTP(msg91.verification, { sMobile: user.sMobile, nOTP: body.code });
    //await textGuru.sendOTP(user.sMobile, body.code);

    user.isMobileVerified = true;

    // user.sMobile = body.sMobile;
    user.sDeviceId = deviceData.oDeviceInfo.sDeviceId; // Used for login sDeviceId manage
    user.sToken = _.encodeToken({
      _id: user._id.toString(),
      eUserType: user.eUserType,
      sDeviceId: user.sDeviceId,
    });
    user.sVerificationToken = '';
    if (decodedToken?.sEmail) {
      log.green('decodedToken.sEmail:', decodedToken.sEmail);
      user.sEmail = decodedToken?.sEmail;
    }

    const userKYC = await KYC.findOne({ iUserId: user._id });
    if (!userKYC) await KYC.create({ iUserId: user._id });
    // await KYC.create({ iUserId: user._id });
    await user.save();
    return res.reply(messages.success('Login'), {}, { authorization: user.sToken });
  } catch (error) {
    console.log('🚀 :: controllers.verifyOtp= :: error:', error);
    log.red('Very Bad 🚀 ~ file: controllers.js:113::::', error);
    return res.reply(messages.server_error(), error);
  }
};
controllers.resendOtp = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sMobile']);
    const query = { sMobile: body.sMobile, eStatus: { $ne: 'd' } };
    if (!body.sMobile) return res.reply(messages.required_field('sMobile'));
    // if (!body.sUpdatedMobile) return res.reply(messages.required_field('sUpdatedMobile'));

    if (_.validateMobile(body.sMobile)) return res.reply(messages.not_valid('sMobile'));
    // if (_.validateMobile(body.sUpdatedMobile)) return res.reply(messages.not_valid('sMobile'));

    const user = await User.findOne(query);
    if (!user) return res.reply(messages.not_found('Account'));
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    // body.nOTP = process.env.NODE_ENV === 'dev' ? _.salt(4) : 1234;
    body.nOTP = process.env.NODE_ENV !== 'prod' ? 1234 : _.salt(4);

    body.sVerificationToken = _.encodeToken({ nOTP: body.nOTP, sMobile: user.sMobile }, { expiresIn: '3m' });
    user.nOTP = body.nOTP;
    user.sVerificationToken = body.sVerificationToken;

    //msg91.sendOTP(msg91.verification, { sMobile: body.sUpdatedMobile, nOTP: body.nOTP }, _.errorCallback);
    // await textGuru.sendOTP(user.sMobile, user.nOTP);
    await user.save();

    // return res.reply(messages.custom.login_otp_success, { nExpiresIn: 3 * 60 * 1000 }, { verification: body.sVerificationToken, nExpiresIn: 3 * 60 * 1000 });

    return res.reply(
      messages.custom.login_otp_success,
      { nExpiresIn: 3 * 60 * 1000, sMobile: user.sMobile, nOTP: user.nOTP },
      { verification: user.sVerificationToken, nExpiresIn: 1 * 60 * 1000, sMessage: 'Otp has been sent successfully' }
    );
  } catch (error) {
    log.red('Very Bad 🚀 ~ file: controllers.js:138 ~ controllers.resendOtp= ~ error:', error);
    return res.reply(messages.server_error(), error);
  }
};
*/

controllers.register = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sEmail', 'sPassword', 'sUserName']);

    if (!body.sEmail) return res.reply(messages.required_field('Email ID'));
    if (!body.sUserName) return res.reply(messages.required_field('UserName'));
    if (!body.sPassword) return res.reply(messages.required_field('Password'));

    if (_.isEmail(body.sEmail)) return res.reply(messages.invalid('Email ID is'));
    if (_.isPassword(body.sPassword)) return res.reply(messages.invalid('Password is'));

    body.sEmail = body.sEmail.toLowerCase();

    const user = await User.findOne({ $or: [{ sEmail: body.sEmail }, { sUserName: body.sUserName }] });
    if (user) return res.reply(messages.already_exists('User'));

    const newUser = new User({
      sEmail: body.sEmail,
      sUserName: body.sUserName,
      sPassword: _.encryptPassword(body.sPassword),
      eUserType: 'user',
      sAvatar: `https://${process.env.S3_BUCKET}.game.webdevprojects.cloud/${_.randomBetween(1, 9)}.png`,
    });

    const sLinkToken = _.encodeToken({ sEmail: body.sEmail }, { expiresIn: '15m' });
    const sLink = `${process.env.BASE_API_PATH}/auth/email/verify/${sLinkToken}`;
    const oMailResult = await nodemailer.send(nodemailer.verification, {
      sEmail: body.sEmail,
      sLink,
      sUserName: body.sUserName,
      sFrontendUrl: process.env.FRONTEND_URL,
    });
    newUser.sVerificationToken = sLinkToken;
    await newUser.save();

    const oDevMailPreview = nodemailer.toPublicResult(oMailResult);
    return res.reply(messages.success('Register'), oDevMailPreview ? { oDevMailPreview } : {});
  } catch (error) {
    console.log('🚀 :: controllers.register= :: error:', error);
    return res.reply(messages.server_error(), error);
  }
};

controllers.login = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sEmail', 'sPassword']);

    if (!body.sEmail) return res.reply(messages.required_field('Email ID or Username'));
    if (!body.sPassword) return res.reply(messages.required_field('Password'));

    const sLogin = String(body.sEmail).trim();
    const sLoginEmail = sLogin.toLowerCase();
    const oExactLoginRegex = new RegExp(`^${escapeRegExp(sLogin)}$`, 'i');
    const user = await User.findOne({
      $or: [
        { sEmail: sLoginEmail },
        { sEmail: oExactLoginRegex },
        { sUserName: sLogin },
        { sUserName: oExactLoginRegex },
      ],
    });
    if (!user) return res.reply(messages.not_found('User'));

    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

    if (user.sPassword !== _.encryptPassword(body.sPassword)) return res.reply(messages.custom.invalid_credentials);
    if (!user.isEmailVerified) {
      const decodedToken = _.verifyToken(user.sVerificationToken);
      if (!decodedToken || decodedToken === 'jwt expired' || decodedToken.exp < Date.now() / 1000) {
        const sLinkToken = _.encodeToken({ sEmail: user.sEmail }, { expiresIn: '15m' });
        const sLink = `${process.env.BASE_API_PATH}/auth/email/verify/${sLinkToken}`;
        const oMailResult = await nodemailer.send(nodemailer.verification, {
          sEmail: user.sEmail,
          sLink,
          sUserName: user.sUserName,
          sFrontendUrl: process.env.FRONTEND_URL,
        });

        await User.updateOne({ _id: user._id }, { $set: { sVerificationToken: sLinkToken } });
        const oDevMailPreview = nodemailer.toPublicResult(oMailResult);
        return res.reply(messages.forbiddenCM('The verify email link sent successfully via mail.'), oDevMailPreview ? { oDevMailPreview } : {});
      }
      const sLink = `${process.env.BASE_API_PATH}/auth/email/verify/${user.sVerificationToken}`;
      const oDevMailPreview =
        process.env.NODE_ENV !== 'prod'
          ? {
              mode: 'preview',
              to: user.sEmail,
              sLink,
            }
          : null;
      return res.reply(messages.forbiddenCM('A verification link is already active. Please check your email.'), oDevMailPreview ? { oDevMailPreview } : {});
    }
    user.sToken = _.encodeToken({ _id: user._id.toString(), eUserType: user.eUserType });
    await user.save();
    return res.reply(messages.success('Login'), { authorization: user.sToken }, { authorization: user.sToken });
  } catch (error) {
    console.log('🚀 :: controllers.login= :: error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};
controllers.refreshToken = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

    user.sToken = _.encodeToken({ _id: user._id.toString(), eUserType: user.eUserType });
    await user.save();
    return res.reply(messages.success('Login'), {}, { authorization: user.sToken });
  } catch (error) {
    res.reply(messages.server_error(), error);
  }
};

controllers.verifyEmail = async (req, res) => {
  try {
    if (!req.params.token) return res.reply(messages.unauthorized());

    const decodedToken = _.verifyToken(req.params.token);
    if (!decodedToken || decodedToken === 'jwt expired' || decodedToken.exp < Date.now() / 1000) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?verificationStatus=expired`);
    }

    const user = await User.findOne({ sEmail: decodedToken.sEmail }).lean();
    if (!user) return res.reply(messages.not_found('User'));

    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    if (user.isEmailVerified) return res.redirect(`${process.env.FRONTEND_URL}/login?verificationStatus=already`);

    await User.updateOne({ _id: user._id }, { $set: { isEmailVerified: true }, $unset: { sVerificationToken: true } });

    const sUserName = encodeURIComponent(user.sUserName || '');
    return res.redirect(`${process.env.FRONTEND_URL}/login?verificationStatus=success&sUserName=${sUserName}`);
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.changePassword = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sOldPassword', 'sNewPassword']);
    if (!body.sOldPassword || !body.sNewPassword) return res.reply(messages.required_field('Old Password and New Password'));

    if (req.user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (req.user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

    if (req.user.sPassword !== _.encryptPassword(body.sOldPassword)) return res.reply(messages.wrong_password('Old Password is'));
    if (_.isPassword(body.sNewPassword)) return res.reply(messages.invalid('Password is'));

    await User.updateOne({ _id: req.user._id }, { $set: { sPassword: _.encryptPassword(body.sNewPassword) } });

    return res.reply(messages.success('Password Changed'));
  } catch (error) {
    return res.reply(messages.server_error('change password'), error.toString());
  }
};

controllers.forgotPassword = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sEmail']);
    if (!body.sEmail) return res.reply(messages.required_field('Email ID'));

    const user = await User.findOne({ sEmail: body.sEmail }, { sEmail: true, sUserName: true });
    if (!user) return res.reply(messages.not_found('User'));
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

    const sLinkToken = _.encodeToken({ sEmail: body.sEmail }, { expiresIn: '15m' });
    const sLink = `${process.env.FRONTEND_URL}/login?forgotPasswordToken=${sLinkToken}`;
    const oMailResult = await nodemailer.send(nodemailer.forgotPassword, {
      sEmail: body.sEmail,
      sLink,
      sUserName: user.sUserName,
      sFrontendUrl: process.env.FRONTEND_URL,
    });

    user.sVerificationToken = sLinkToken;
    await user.save();

    const oDevMailPreview = nodemailer.toPublicResult(oMailResult);
    return res.reply(messages.custom.reset_password_link_sent, oDevMailPreview ? { oDevMailPreview } : {});
  } catch (error) {
    return res.reply(messages.server_error('forgot password'), error.toString());
  }
};

controllers.resetPassword = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sPassword']);
    if (!body.sPassword) return res.reply(messages.required_field('Password'));

    const token = req.params.token;
    if (!token) return res.reply(messages.required_field('Token'));

    const decodedToken = _.verifyToken(token);
    if (!decodedToken || decodedToken === 'jwt expired') return res.reply(messages.expired('Link'));

    const user = await User.findOne({ sEmail: decodedToken.sEmail }, { sPassword: true, sVerificationToken: true });
    if (!user) return res.reply(messages.not_found('User'));
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    if (!user.sVerificationToken) return res.reply(messages.expired('Link'));

    if (_.isPassword(body.sPassword)) return res.reply(messages.invalid('Password'));

    await User.updateOne({ _id: user._id }, { $set: { sPassword: _.encryptPassword(body.sPassword) }, $unset: { sToken: true, sVerificationToken: true } });
    return res.reply(messages.success('Password Reset'));
  } catch (error) {
    return res.reply(messages.server_error('reset password'), error.toString());
  }
};

controllers.verifyForgotPasswordMailLink = async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) return res.reply(messages.required_field('Token'));

    const decodedToken = _.verifyToken(token);
    if (!decodedToken || decodedToken === 'jwt expired') return res.reply(messages.expired('Link'));

    const user = await User.findOne({ sEmail: decodedToken.sEmail }).lean();
    if (!user) return res.reply(messages.not_found('User'));

    if (!user.sVerificationToken) return res.reply(messages.custom.forgot_password_link_expired);
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

    return res.reply(messages.success());
  } catch (error) {
    return res.reply(messages.server_error('verify forgot password'), error.toString());
  }
};

controllers.autoLoginUsers = async (req, res) => {
  try {
    const users = await User.find({ sToken: { $exists: false } }, { eUserType: true });
    for (const user of users) {
      user.sToken = _.encodeToken({ _id: user._id.toString(), eUserType: user.eUserType });
      await user.save();
    }
    return res.reply(messages.success('Auto Login'), {});
  } catch (error) {
    res.reply(messages.server_error(), error);
  }
};
controllers.guestLogin = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sDeviceId', 'sPushToken']);

    if (!body.sDeviceId) return res.reply(messages.required_field('Device Id'));
    const user = await User.findOne({ sDeviceId: body.sDeviceId, eUserType: 'guest' });

    let newUser;
    if (!user) {
      let createUser = fakeUser.getRandomPlayer();
      const uniqueSuffix = `${Date.now()}${_.randomBetween(100, 999)}`;
      createUser.sUserName = `guest_${createUser.sUserName}_${uniqueSuffix}`;
      createUser.sDeviceId = body.sDeviceId;
      createUser.sPushToken = body.sPushToken;
      createUser.eUserType = 'guest';
      createUser.isEmailVerified = false;
      createUser.nChips = 0;
      newUser = await User.create(createUser);
      newUser.sToken = _.encodeToken({ _id: newUser._id, eUserType: newUser.eUserType });
      await newUser.save();
      newUser = { sToken: newUser.sToken };
    } else if (!user.sToken) {
      user.sToken = _.encodeToken({ _id: user._id, eUserType: user.eUserType });
      await user.save();
    }
    req.user = !user ? newUser : user.toObject ? user.toObject() : user;

    return res.reply(messages.success(), req.user, { authorization: req.user.sToken });
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};
controllers.socialLogin = async (req, res) => {
  try {
    const body = _.pick(req.body, ['idToken', 'sPushToken']);
    if (!body.idToken) return res.reply(messages.required_field('Social Token'));

    const deviceData = _.pick(req.body, ['oDeviceInfo']);
    // log.green('Very Bad 🚀 ~ file: controllers.js:44 ~ controllers.login= ~ deviceData:', deviceData);
    try {
      deviceData.oDeviceInfo = JSON.parse(deviceData.oDeviceInfo);
    } catch (e) {
      deviceData.oDeviceInfo = {};
    }

    const oAuth2Client = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT, process.env.GOOGLE_AUTH_SECRET);
    const verifyGoogleToken = await oAuth2Client.verifyIdToken({
      idToken: body.idToken,
      audience: process.env.GOOGLE_AUTH_CLIENT,
    });
    const googleData = verifyGoogleToken.getPayload();

    // const googleRes = await (await request(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`)).body.json();
    const googleRes = await axios
      .get(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`)
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching token info:', error);
        throw error;
      });

    if (googleData?.sub !== googleRes.sub || googleRes.email !== googleData?.email) return res.reply(messages.unauthorized());
    let socialData = {
      sUserName: googleData?.name,
      sEmail: googleData?.email,
      sGoogleId: googleData?.sub,
      eLoginType: 'G',
      sPushToken: body.sPushToken,
    };

    const query = {
      sEmail: socialData.sEmail,
      eUserType: 'user',
      eStatus: 'y',
      // eLoginType: 'G',
      // $or: [{ sGoogleId: socialData.sGoogleId }, { sEmail: socialData.sEmail }],
    };

    const project = {
      _id: true,
      sEmail: true,
      sMobile: true,
      isMobileVerified: true,
      eStatus: true,
      sToken: true,
      eUserType: true,
      eLoginType: true,
    };

    let user = await User.findOne(query, project);
    if (!user) {
      const userData = {
        ...socialData,
        eUserType: 'user',
        sDeviceId: deviceData.oDeviceInfo.sDeviceId,
        sPushToken: body.sPushToken,
        isEmailVerified: true,
        isMobileVerified: true,
      };

      user = new User(userData);

      user.sToken = _.encodeToken({
        _id: user._id.toString(),
        eUserType: user.eUserType,
        sDeviceId: user.sDeviceId,
      });
      await user.save();
      return res.reply(messages.successfully('Login'), { authorization: user.sToken }, { authorization: user.sToken });
    } else {
      if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
      if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

      user.eLoginType = 'G';
      user.sDeviceId = deviceData.oDeviceInfo.sDeviceId;
      user.sPushToken = body.sPushToken;
      //user.sUserName = socialData.sUserName;
      // user.sProfilePic = socialData.sProfilePic; //TODO:ADD image and username
      user.sToken = _.encodeToken({
        _id: user._id.toString(),
        eUserType: user.eUserType,
        sDeviceId: user.sDeviceId,
      });
      await user.save();
      return res.reply(messages.successfully('Login'), { authorization: user.sToken, isEmailVerified: true }, { authorization: user.sToken, isEmailVerified: true });
    }
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error(), error);
  }
};
controllers.firebaseNotifyTest = async (req, res) => {
  try {
    await firebase.notify(req.body, (error, response) => {
      if (error) return res.reply(messages.server_error('Firebase Notify Callback'), error);
      return res.reply(messages.success(), response);
    });
  } catch (error) {
    console.log('🚀 :: awaitfirebase.notify :: error:', error);
    return res.reply(messages.server_error('Firebase Notify API'), error);
  }
};

module.exports = controllers;
