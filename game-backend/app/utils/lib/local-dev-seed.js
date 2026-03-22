const { BoardProtoType, Setting } = require('../../models');

const DEFAULT_AVATARS = Array.from({ length: 9 }, (_, index) => `https://api.dicebear.com/9.x/adventurer/svg?seed=21-holdem-${index + 1}`);

const DEFAULT_SETTINGS = {
  nRakeAmount: 5,
  aDailyReward: [100, 200, 300, 400, 500, 750, 1000],
  aAvatar: DEFAULT_AVATARS,
  aShop: [
    { sTitle: 'Starter Stack', nChips: 5000, nPrice: 0.99, sCurrency: 'USD' },
    { sTitle: 'Table Refill', nChips: 15000, nPrice: 2.99, sCurrency: 'USD' },
    { sTitle: 'Night Session', nChips: 50000, nPrice: 7.99, sCurrency: 'USD' },
  ],
};

const DEFAULT_BOARD_PROTOTYPES = [
  {
    sName: 'Starter Table',
    nTurnTime: 20,
    nMaxPlayer: 9,
    nMinBuyIn: 1000,
    nMinBet: 100,
    ePokerType: 'pokerJack',
    eStatus: 'y',
  },
  {
    sName: 'Classic Table',
    nTurnTime: 20,
    nMaxPlayer: 9,
    nMinBuyIn: 5000,
    nMinBet: 250,
    ePokerType: 'pokerJack',
    eStatus: 'y',
  },
  {
    sName: 'High Roller',
    nTurnTime: 20,
    nMaxPlayer: 9,
    nMinBuyIn: 25000,
    nMinBet: 1000,
    ePokerType: 'pokerJack',
    eStatus: 'y',
  },
];

async function ensureLocalDevSeedData() {
  const setting = await Setting.findOne({});
  if (!setting) {
    await Setting.create(DEFAULT_SETTINGS);
  } else {
    const update = {};

    if (!Array.isArray(setting.aDailyReward) || !setting.aDailyReward.length) update.aDailyReward = DEFAULT_SETTINGS.aDailyReward;
    if (!Array.isArray(setting.aAvatar) || !setting.aAvatar.length) update.aAvatar = DEFAULT_SETTINGS.aAvatar;
    if (!Array.isArray(setting.aShop) || !setting.aShop.length) update.aShop = DEFAULT_SETTINGS.aShop;
    if (typeof setting.nRakeAmount !== 'number') update.nRakeAmount = DEFAULT_SETTINGS.nRakeAmount;

    if (Object.keys(update).length) {
      await Setting.updateOne({ _id: setting._id }, { $set: update });
    }
  }

  const prototypeCount = await BoardProtoType.countDocuments({});
  if (!prototypeCount) {
    await BoardProtoType.insertMany(DEFAULT_BOARD_PROTOTYPES);
  }
}

module.exports = {
  ensureLocalDevSeedData,
};
