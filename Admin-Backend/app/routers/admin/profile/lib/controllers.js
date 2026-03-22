const { User } = require('../../../../models/index.js');

const controllers = {};

controllers.getProfile = (req, res) => {
  const body = _.pick(req.admin, ['_id', 'sUserName', 'eGender', 'eUserType', 'sEmail', 'sMobile', 'isEmailVerified', 'isMobileVerified']);
  return res.reply(messages.success(), body);
};

controllers.logout = async (req, res) => {
  try {
    const query = { _id: req.admin._id };
    await User.updateOne(query, { $unset: { sToken: true } });
    return res.reply(messages.successfully('Logout'));
  } catch (error) {
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.editProfile = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sFullName', 'sUserName', 'sMobile', 'eGender', 'sEmail']);
    const query = { _id: req.admin._id };
    const user = await User.findOne(query);
    if (body.sEmail && body.sEmail !== user.sEmail) {
      user.sEmail = body.sEmail;
      // const sLinkToken = _.encodeToken({ sEmail: admin.sEmail, sNewEmail: body.sEmail }, { expiresIn: '1h' });
      // const sLink = `${process.env.BASE_API_PATH}/admin/auth/email/verify/${sLinkToken}`;
      // ses.send(ses.adminVerifyEmail, { sEmail: body.sEmail, sLink }, _.errorCallback);
    }
    if (body.sUserName) {
      if (_.isUserName(body.sUserName)) return res.reply(messages.custom.username_allow_only);
      user.sUserName = body.sUserName;
    }
    if (body.sMobile && body.sMobile !== user.sMobile) {
      user.sMobile = body.sMobile;
      //  admin.nOTP = _.salt(4);
      // msg91.sendOTP(msg91.forgotPassword, { sMobile: `91${body.sMobile}`, nOTP: admin.nOTP }, _.errorCallback);
    }
    if (body.eGender) user.eGender = body.eGender;
    await user.save();
    return res.reply(messages.successfully('Your profile updated', body));
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:39 ~ controllers.editProfile ::::', error);
    return res.reply(messages.server_error(), error.toString());
  }
};
controllers.updatePassword = (req, res) => {
  const body = _.pick(req.body, ['sPassword', 'sNewPassword']);
  if (req.admin.sPassword !== _.encryptPassword(body.sPassword)) return res.reply(messages.wrong_credentials('password'));
  if (body.sPassword === body.sNewPassword) return res.reply(messages.custom.duplicate_password);

  const query = { _id: req.admin._id };
  const updateQuery = { sPassword: _.encryptPassword(body.sNewPassword), sToken: '' };
  User.updateOne(query, { $set: updateQuery }, error => {
    if (error) return res.reply(messages.server_error(), error.toString());
    return res.reply(messages.successfully('Your password updated'));
  });
};
controllers.changePassword = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sPassword', 'sNewPassword']);
    if (!body.sPassword) return res.reply(messages.required_field('password'));
    if (!body.sNewPassword) return res.reply(messages.required_field('new password'));
    if (req.admin.sPassword !== _.encryptPassword(body.sPassword)) return res.reply(messages.wrong_password());
    if (body.sPassword === body.sNewPassword) return res.reply(messages.custom.duplicate_password);
    // if (body.sNewPassword !== body.sConfirmPassword) return res.reply(messages.not_matched('new password and confirm password'));
    const query = { _id: req.admin._id };
    const updateQuery = { sPassword: _.encryptPassword(body.sNewPassword), sToken: '' };

    await User.updateOne(query, { $set: updateQuery });
    return res.reply(messages.successfully('Password changed'));
  } catch (error) {
    console.log(`🚀 ~ file: controllers.js:71 ~ controllers.changePassword= ~ error:`, error);
    log.red('🚀 Controller Error::', error.toString());
    return res.reply(messages.server_error(), error);
  }
};
module.exports = controllers;
