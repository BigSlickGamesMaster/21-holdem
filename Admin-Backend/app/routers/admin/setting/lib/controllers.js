const { Setting } = require('../../../../models');

const controllers = {};

controllers.getSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({}).lean();
    return res.reply(messages.success(), setting);
  } catch (error) {
    console.log('getSetting::::', error);
    return res.reply(messages.server_error('setting/getSetting'), error.toString());
  }
};

controllers.updateSetting = async (req, res) => {
  try {
    const body = _.pick(req.body, ['nRakeAmount', 'aDailyReward', 'aShop']);
    console.log("bodst::::",body)

    if (body.nRakeAmount < 0 || body.nRakeAmount > 100) return res.reply(messages.custom.rake_amount_not_valid);
    if(body.aShop) {

    }

    await Setting.updateOne({}, { $set: body });

    return res.reply(messages.successfully('Setting updated'));
  } catch (error) {
    console.log('updateSetting::::', error);
    return res.reply(messages.server_error('setting/updateSetting'), error.toString());
  }
};

module.exports = controllers;
