const { Analytics } = require('../../../../models');

const controllers = {};

controllers.analytics = async (req, res) => {
  try {
    const body = _.pick(req.query, ['nInAppTime', 'nInGameTime']);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = { iUserId: req.user._id, dCreatedDate: { $gte: today } };
    const update = { $inc: {} };
    if (body.nInAppTime) update.$inc.nInAppTime = Math.floor(body.nInAppTime / 1000);
    if (body.nInGameTime) update.$inc.nInGameTime = Math.floor(body.nInGameTime / 1000);

    await Analytics.findOneAndUpdate(query, update, { upsert: true, setDefaultsOnInsert: true });

    return res.reply(messages.successfully('Analytics created/updated'));
  } catch (error) {
    console.log('analytics error ::', error);
    return res.reply(messages.server_error('analytics'));
  }
};

module.exports = controllers;
