const { Setting, Transaction, User } = require('../../../../models');

const controllers = {};

controllers.getShopList = async (req, res) => {
  try {
    const shopList = await Setting.findOne({}, { _id: 0, aShop: 1 }).lean();
    return res.reply(messages.success(), shopList.aShop);
  } catch (error) {
    console.log(`🚀 ~ file: controllers.js:33 ~ controllers.getShopList= ~ error:`, error);
    return res.reply(messages.server_error(), error);
  }
};

controllers.buyItem = async (req, res) => {
  try {
    const body = _.pick(req.body, ['nPrice']);
    if (!body.nPrice) return res.reply(messages.required_field('nPrice'));

    const shopItem = await Setting.findOne({}, { _id: 0, aShop: 1 }).lean();
    if (!shopItem.aShop.length) return res.reply(messages.invalid_req('aShop'));

    const item = shopItem.aShop.find(item => item.nPrice === body.nPrice);
    if (!item) return res.reply(messages.invalid_req('nPrice'));

    await User.updateOne({ _id: req.user._id }, { $inc: { nChips: item.nChips } });
    await Transaction.create({ iUserId: req.user._id, nAmount: item.nChips, eType: 'credit', eMode: 'IAP', eStatus: 'Success' });

    return res.reply(messages.success(`${item.nChips} purchased successfully`));
  } catch (error) {
    console.log(`🚀 ~ file: controllers.js:33 ~ controllers.buyItem= ~ error:`, error);
    return res.reply(messages.server_error(), error);
  }
};

module.exports = controllers;
