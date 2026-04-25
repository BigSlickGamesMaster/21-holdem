const { User } = require('../../../../models');
const { ses, nodemailer } = require('../../../../utils');

const controllers = {};

controllers.register = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sEmail', 'sPassword', 'eUserType', 'sUserName', 'sMobile']);
    if (!body.sEmail) return res.reply(messages.required_field('Email'));
    if (!body.sPassword) return res.reply(messages.required_field('Password'));
    if (!body.sUserName) return res.reply(messages.required_field('Username'));

    if (!body.sMobile) return res.reply(messages.required_field('Mobile'));
    const query = {
      eUserType: 'admin',
      sEmail: body.sEmail,
    };
    const user = await User.findOne(query);
    if (user) {
      if (user.sEmail === body.sEmail) return res.reply(messages.custom.already_exists_email);
      if (user.sUserName === body.sUserName) return res.reply(messages.custom.already_exists_username);
      if (user.sMobile === body.sMobile) return res.reply(messages.custom.already_exists_mobile);
    }
    body.sPassword = _.encryptPassword(body.sPassword);
    body.eUserType = 'admin';
    await User.create(body);

    return res.reply(messages.success(`Admin created with username ${body.sUserName}`));
  } catch (error) {
    log.red('🚀 controller Error::', error.toString());
    return res.reply(messages.server_error(), error);
  }
};

controllers.login = async (req, res) => {
  try {
    const source = Object.keys(req.body || {}).length ? req.body : req.query;
    const body = _.pick(source, ['sEmail', 'sPassword']);
    const query = {
      $or: [{ sUserName: body.sEmail }, { sEmail: body.sEmail }],
      eUserType: 'admin',
    };
    const admin = await User.findOne(query);
    if (!admin) return res.reply(messages.custom.admin_not_found);
    if (admin.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (admin.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    if (_.encryptPassword(body.sPassword) !== admin.sPassword) return res.reply(messages.wrong_credentials());
    admin.sToken = _.encodeToken({ _id: admin._id.toString(), eUserType: admin.eUserType });
    await admin.save();
    return res.reply(messages.success('Login'), { authorization: admin.sToken }, { authorization: admin.sToken });
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:53 ~ controllers.login :::', error);
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.forgotPassword = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sEmail']);
    if (!body.sEmail) return res.reply(messages.required_field('Email'));

    const user = await User.findOne({ sEmail: body.sEmail, eUserType: 'admin' });
    if (!user) return res.reply(messages.custom.forgot_password);
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);

    const sLinkToken = _.encodeToken({ sEmail: body.sEmail, _id: user._id }, { expiresIn: '15m' });
    const sLink = `${process.env.FRONTEND_URL}/reset-password/${sLinkToken}`;
    nodemailer.send(nodemailer.adminForgotPassword, { sEmail: user.sEmail, sLink, sUserName: user.sUserName, sFrontendUrl: process.env.FRONTEND_URL }, _.emptyCallback);

    user.sVerificationToken = sLinkToken;
    await user.save();

    return res.reply(messages.custom.reset_password_link_sent);
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:95 ~ controllers.forgotPassword= ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};

controllers.resetPassword = async (req, res) => {
  const body = _.pick(req.body, ['sPassword']);
  if (!body.sPassword) return res.reply(messages.required_field('Password'));

  const token = req.params.token;
  if (!token) return res.reply(messages.required_field('Token'));

  const decodedToken = _.verifyToken(token);
  if (!decodedToken || decodedToken === 'jwt expired') return res.reply(messages.expired('Link'));

  if (_.isPassword(body.sPassword)) return res.reply(messages.invalid('Password is'));

  const user = await User.findOne({ sEmail: decodedToken.sEmail });
  if (!user) return res.reply(messages.not_found('User'));
  if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
  if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
  if (!user.sVerificationToken) return res.reply(messages.expired('Link'));

  await User.updateOne({ _id: user._id }, { $set: { sPassword: _.encryptPassword(body.sPassword) }, $unset: { sToken: true, sVerificationToken: true } });

  return res.reply(messages.successfully('Your password has been changed'));
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
module.exports = controllers;
