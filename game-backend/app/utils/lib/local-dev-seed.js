const { BoardProtoType, Setting } = require('../../models');
const systemBots = require('./system-bots');

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
    nMinBet: 50,
    ePokerType: 'TwentyOneHoldem',
    eStatus: 'y',
  },
  {
    sName: 'Classic Table',
    nTurnTime: 20,
    nMaxPlayer: 9,
    nMinBuyIn: 5000,
    nMinBet: 125,
    ePokerType: 'TwentyOneHoldem',
    eStatus: 'y',
  },
  {
    sName: 'High Roller',
    nTurnTime: 20,
    nMaxPlayer: 9,
    nMinBuyIn: 25000,
    nMinBet: 500,
    ePokerType: 'TwentyOneHoldem',
    eStatus: 'y',
  },
];

const LEGACY_BOARD_MIN_BET_UPDATES = {
  'Starter Table': { 100: 50 },
  'Classic Table': { 250: 125 },
  'High Roller': { 1000: 500 },
  'High 100': { 100: 50 },
  'Blinds 50/100': { 50: 25 },
  'Blinds 100/200': { 100: 50 },
  'Blinds 250/500': { 250: 125 },
  'Blinds 500/1000': { 500: 250 },
  'Blinds 1000/2000': { 1000: 500 },
};

async function syncDefaultBoardPrototypes() {
  await BoardProtoType.collection.updateMany({ ePokerType: 'pokerJack' }, { $set: { ePokerType: 'TwentyOneHoldem' } });

  for (const oPrototype of DEFAULT_BOARD_PROTOTYPES) {
    const oExistingPrototype = await BoardProtoType.findOne({ sName: oPrototype.sName }).lean();
    if (!oExistingPrototype) {
      await BoardProtoType.create(oPrototype);
      continue;
    }

    const oUpdate = {};
    if (!(Number(oExistingPrototype.nTurnTime) > 0)) oUpdate.nTurnTime = oPrototype.nTurnTime;
    if (!(Number(oExistingPrototype.nMaxPlayer) > 0)) oUpdate.nMaxPlayer = oPrototype.nMaxPlayer;
    if (!(Number(oExistingPrototype.nMinBuyIn) > 0)) oUpdate.nMinBuyIn = oPrototype.nMinBuyIn;
    if (!oExistingPrototype.ePokerType) oUpdate.ePokerType = oPrototype.ePokerType;
    if (!oExistingPrototype.eStatus) oUpdate.eStatus = oPrototype.eStatus;

    if (Object.keys(oUpdate).length) {
      await BoardProtoType.updateOne({ _id: oExistingPrototype._id }, { $set: oUpdate });
    }
  }

  const aLegacyBoardNames = Object.keys(LEGACY_BOARD_MIN_BET_UPDATES);
  const aLegacyBoards = await BoardProtoType.find({ sName: { $in: aLegacyBoardNames } }, { sName: 1, nMinBet: 1 }).lean();

  for (const oLegacyBoard of aLegacyBoards) {
    const oBlindUpdate = LEGACY_BOARD_MIN_BET_UPDATES[oLegacyBoard.sName] || {};
    const nUpdatedBlind = oBlindUpdate[Number(oLegacyBoard.nMinBet)];
    if (!nUpdatedBlind || nUpdatedBlind === Number(oLegacyBoard.nMinBet)) continue;

    await BoardProtoType.updateOne({ _id: oLegacyBoard._id }, { $set: { nMinBet: nUpdatedBlind } });
  }
}

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

  await syncDefaultBoardPrototypes();

  await systemBots.ensureSystemBotUsers({ nMinChips: 10000 });
}

module.exports = {
  ensureLocalDevSeedData,
};
