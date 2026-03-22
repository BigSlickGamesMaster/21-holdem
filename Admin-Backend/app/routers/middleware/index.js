const { User } = require('../../models');
const { requestLimiter } = require('../../utils');

const middlewares = {};

middlewares.apiLimiter = (req, res, next) => {
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

middlewares.isAuthenticated = async (req, res, next) => {
  try {
    const token = req.header('authorization');
    if (!token) return res.reply(messages.unauthorized());

    const decodedToken = _.decodeToken(token);
    if (!decodedToken) return res.reply(messages.unauthorized());

    const query = { _id: decodedToken._id };
    const admin = await User.findOne(query);
    if (!admin) return res.reply(messages.custom.user_not_found);
    if (admin.sToken !== token) return res.reply(messages.unauthorized());
    if (admin.eUserType !== 'admin') return res.reply(messages.unauthorized());
    if (admin.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    if (admin.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    req.admin = admin;
    next();
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: middlewares.js:39 ~ error:', error);
    return res.reply(messages.server_error(), error.toString());
  }
};

module.exports = middlewares;
