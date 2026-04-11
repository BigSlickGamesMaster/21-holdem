const helper = require('../../../globals/lib/helper');
const { Setting, Transaction, User } = require('../../models');

const BOT_EMAIL_DOMAIN = process.env.SYSTEM_BOT_EMAIL_DOMAIN || 'playholdem.local';
const BOT_SHARED_PASSWORD = process.env.SYSTEM_BOT_PASSWORD || 'RiverShift2026!';

const BOT_STYLE_PRESETS = {
  balanced: {
    sLabel: 'Balanced',
    nStandScore: 19,
    nCheckScore: 17,
    nOpenRaiseMinScore: 13,
    nOpenRaiseMaxScore: 17,
    nCounterRaiseMinScore: 16,
    nFallbackStandScore: 16,
    nPressureTolerance: 0.26,
    nCounterPressureTolerance: 0.16,
    nAllInPressure: 0.7,
    nLooseCallScore: 18,
    nDoubleDownMinScore: 9,
    nDoubleDownMaxScore: 11,
    nOpenRaiseChance: 0.34,
    nCounterRaiseChance: 0.2,
    nLooseCallChance: 0.18,
  },
  patient: {
    sLabel: 'Patient',
    nStandScore: 18,
    nCheckScore: 16,
    nOpenRaiseMinScore: 14,
    nOpenRaiseMaxScore: 16,
    nCounterRaiseMinScore: 17,
    nFallbackStandScore: 15,
    nPressureTolerance: 0.18,
    nCounterPressureTolerance: 0.11,
    nAllInPressure: 0.82,
    nLooseCallScore: 16,
    nDoubleDownMinScore: 10,
    nDoubleDownMaxScore: 11,
    nOpenRaiseChance: 0.22,
    nCounterRaiseChance: 0.12,
    nLooseCallChance: 0.08,
  },
  pressure: {
    sLabel: 'Pressure',
    nStandScore: 20,
    nCheckScore: 18,
    nOpenRaiseMinScore: 12,
    nOpenRaiseMaxScore: 18,
    nCounterRaiseMinScore: 15,
    nFallbackStandScore: 17,
    nPressureTolerance: 0.34,
    nCounterPressureTolerance: 0.24,
    nAllInPressure: 0.64,
    nLooseCallScore: 19,
    nDoubleDownMinScore: 8,
    nDoubleDownMaxScore: 11,
    nOpenRaiseChance: 0.5,
    nCounterRaiseChance: 0.35,
    nLooseCallChance: 0.3,
  },
  opportunist: {
    sLabel: 'Opportunist',
    nStandScore: 19,
    nCheckScore: 17,
    nOpenRaiseMinScore: 13,
    nOpenRaiseMaxScore: 18,
    nCounterRaiseMinScore: 16,
    nFallbackStandScore: 16,
    nPressureTolerance: 0.29,
    nCounterPressureTolerance: 0.21,
    nAllInPressure: 0.66,
    nLooseCallScore: 18,
    nDoubleDownMinScore: 9,
    nDoubleDownMaxScore: 11,
    nOpenRaiseChance: 0.4,
    nCounterRaiseChance: 0.28,
    nLooseCallChance: 0.24,
  },
  anchor: {
    sLabel: 'Anchor',
    nStandScore: 18,
    nCheckScore: 16,
    nOpenRaiseMinScore: 14,
    nOpenRaiseMaxScore: 17,
    nCounterRaiseMinScore: 17,
    nFallbackStandScore: 15,
    nPressureTolerance: 0.2,
    nCounterPressureTolerance: 0.12,
    nAllInPressure: 0.8,
    nLooseCallScore: 17,
    nDoubleDownMinScore: 9,
    nDoubleDownMaxScore: 10,
    nOpenRaiseChance: 0.18,
    nCounterRaiseChance: 0.1,
    nLooseCallChance: 0.06,
  },
  wildcard: {
    sLabel: 'Wildcard',
    nStandScore: 20,
    nCheckScore: 18,
    nOpenRaiseMinScore: 11,
    nOpenRaiseMaxScore: 18,
    nCounterRaiseMinScore: 14,
    nFallbackStandScore: 16,
    nPressureTolerance: 0.38,
    nCounterPressureTolerance: 0.27,
    nAllInPressure: 0.62,
    nLooseCallScore: 19,
    nDoubleDownMinScore: 8,
    nDoubleDownMaxScore: 12,
    nOpenRaiseChance: 0.46,
    nCounterRaiseChance: 0.34,
    nLooseCallChance: 0.32,
  },
};

const BOT_ACCOUNT_BLUEPRINTS = [
  { sUserName: 'rileycross', eGender: 'female', sStyle: 'balanced' },
  { sUserName: 'evanwells', eGender: 'male', sStyle: 'pressure' },
  { sUserName: 'harperlane', eGender: 'female', sStyle: 'patient' },
  { sUserName: 'calebfrost', eGender: 'male', sStyle: 'anchor' },
  { sUserName: 'zoecarter', eGender: 'female', sStyle: 'opportunist' },
  { sUserName: 'julianvale', eGender: 'male', sStyle: 'wildcard' },
  { sUserName: 'leahmarlow', eGender: 'female', sStyle: 'balanced' },
  { sUserName: 'owenbarrett', eGender: 'male', sStyle: 'pressure' },
  { sUserName: 'niabennett', eGender: 'female', sStyle: 'patient' },
  { sUserName: 'declanprice', eGender: 'male', sStyle: 'anchor' },
  { sUserName: 'ivymercer', eGender: 'female', sStyle: 'opportunist' },
  { sUserName: 'gabrielstone', eGender: 'male', sStyle: 'wildcard' },
  { sUserName: 'sadiepierce', eGender: 'female', sStyle: 'balanced' },
  { sUserName: 'tristancole', eGender: 'male', sStyle: 'pressure' },
  { sUserName: 'islarhodes', eGender: 'female', sStyle: 'patient' },
  { sUserName: 'mileswest', eGender: 'male', sStyle: 'anchor' },
  { sUserName: 'claramonroe', eGender: 'female', sStyle: 'opportunist' },
  { sUserName: 'nathanreed', eGender: 'male', sStyle: 'wildcard' },
  { sUserName: 'aubreyquinn', eGender: 'female', sStyle: 'balanced' },
  { sUserName: 'romanellis', eGender: 'male', sStyle: 'pressure' },
];

function getBotAvatar(sUserName = '') {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=21-holdem-${encodeURIComponent(sUserName)}`;
}

function getBotEmail(sUserName = '') {
  return `${sUserName}@${BOT_EMAIL_DOMAIN}`;
}

function getBotSeatCap(nMaxPlayer = 0) {
  const nTableSize = Number(nMaxPlayer) || 0;
  const oSeatCaps = {
    4: 2,
    6: 4,
    9: 5,
  };

  if (oSeatCaps[nTableSize] !== undefined) return oSeatCaps[nTableSize];
  return Math.max(Math.min(nTableSize - 1, Math.ceil(nTableSize * 0.6)), 0);
}

function getBotStyleProfile(sStyle = 'balanced') {
  const oPreset = BOT_STYLE_PRESETS[sStyle] || BOT_STYLE_PRESETS.balanced;
  return {
    sStyle,
    ...oPreset,
  };
}

function getSystemBotUsernames() {
  return BOT_ACCOUNT_BLUEPRINTS.map(bot => bot.sUserName);
}

async function ensureSystemBotUsers({ nMinChips = 10000 } = {}) {
  const nSafeMinChips = Math.max(Number(nMinChips) || 0, 10000);
  const sEncryptedPassword = helper.encryptPassword(BOT_SHARED_PASSWORD);

  await Promise.all(
    BOT_ACCOUNT_BLUEPRINTS.map(async bot => {
      const oBotProfile = getBotStyleProfile(bot.sStyle);
      const oExistingBot = await User.findOne({ sUserName: bot.sUserName, eUserType: 'bot' });
      if (!oExistingBot) {
        await User.create({
          sUserName: bot.sUserName,
          sEmail: getBotEmail(bot.sUserName),
          sPassword: sEncryptedPassword,
          eUserType: 'bot',
          eGender: bot.eGender,
          eStatus: 'y',
          nChips: nSafeMinChips,
          isEmailVerified: true,
          sAvatar: getBotAvatar(bot.sUserName),
          oBotProfile,
        });
        return;
      }

      const oUpdate = {
        sEmail: oExistingBot.sEmail || getBotEmail(bot.sUserName),
        eGender: bot.eGender,
        eStatus: 'y',
        isEmailVerified: true,
        sAvatar: oExistingBot.sAvatar || getBotAvatar(bot.sUserName),
        oBotProfile,
      };

      if (!oExistingBot.sPassword) oUpdate.sPassword = sEncryptedPassword;
      if ((Number(oExistingBot.nChips) || 0) < nSafeMinChips) oUpdate.nChips = nSafeMinChips;

      await User.updateOne({ _id: oExistingBot._id }, { $set: oUpdate });
    })
  );

  return await User.find({ sUserName: { $in: getSystemBotUsernames() }, eUserType: 'bot' }).sort({ sUserName: 1 });
}

async function getAvailableSystemBots({ nCount = 0, nMinChips = 0, aExcludeUserIds = [] } = {}) {
  if (!(nCount > 0)) return [];

  await ensureSystemBotUsers({ nMinChips });
  const aExcludeSet = new Set(aExcludeUserIds.map(iUserId => helper.toString(iUserId)));
  const aBots = await User.find({ sUserName: { $in: getSystemBotUsernames() }, eUserType: 'bot', eStatus: 'y' }).sort({ sUserName: 1 });
  const aAvailableBots = [];

  for (const bot of aBots) {
    const sUserId = helper.toString(bot._id);
    if (aExcludeSet.has(sUserId)) continue;
    if (Array.isArray(bot.aPokerBoard) && bot.aPokerBoard.length) continue;

    if ((Number(bot.nChips) || 0) < (Number(nMinChips) || 0)) {
      await topUpBotBankroll({ iUserId: bot._id, nMinRequiredChips: nMinChips });
      bot.nChips = Math.max(Number(bot.nChips) || 0, Number(nMinChips) || 0);
    }

    aAvailableBots.push(bot);
    if (aAvailableBots.length >= nCount) break;
  }

  return aAvailableBots;
}

function getShopPackagesForTopUp(aShop = [], nMissingChips = 0) {
  const aSortedPackages = [...aShop]
    .filter(item => Number(item?.nChips) > 0)
    .sort((firstItem, secondItem) => Number(firstItem.nChips) - Number(secondItem.nChips));

  if (!(nMissingChips > 0) || !aSortedPackages.length) return [];

  const aSelectedPackages = [];
  let nRemaining = nMissingChips;

  while (nRemaining > 0) {
    const oPackage = aSortedPackages.find(item => Number(item.nChips) >= nRemaining) || aSortedPackages[aSortedPackages.length - 1];
    if (!oPackage) break;
    aSelectedPackages.push(oPackage);
    nRemaining -= Number(oPackage.nChips) || 0;
  }

  return aSelectedPackages;
}

async function topUpBotBankroll({ iUserId, nMinRequiredChips = 0, sReason = 'System bot auto top-up' } = {}) {
  const nTargetChips = Math.max(Number(nMinRequiredChips) || 0, 0);
  if (!nTargetChips || !iUserId) return null;

  const botUser = await User.findOne({ _id: iUserId, eUserType: 'bot' });
  if (!botUser) return null;

  const nCurrentChips = Number(botUser.nChips) || 0;
  if (nCurrentChips >= nTargetChips) return botUser;

  const nMissingChips = nTargetChips - nCurrentChips;
  const oSetting = await Setting.findOne({}, { _id: 0, aShop: 1 }).lean();
  const aPackages = getShopPackagesForTopUp(oSetting?.aShop || [], nMissingChips);
  const nCreditedChips = aPackages.reduce((nTotal, item) => nTotal + (Number(item.nChips) || 0), 0) || nMissingChips;

  await User.updateOne({ _id: botUser._id }, { $inc: { nChips: nCreditedChips } });

  if (aPackages.length) {
    await Transaction.insertMany(
      aPackages.map(item => ({
        iUserId: botUser._id,
        nAmount: Number(item.nChips) || 0,
        eType: 'credit',
        eMode: 'IAP',
        eStatus: 'Success',
        sDescription: `${sReason}: ${item.sTitle || 'Shop package'}`,
      }))
    );
  } else {
    await Transaction.create({
      iUserId: botUser._id,
      nAmount: nCreditedChips,
      eType: 'credit',
      eMode: 'IAP',
      eStatus: 'Success',
      sDescription: sReason,
    });
  }

  botUser.nChips = nCurrentChips + nCreditedChips;
  return botUser;
}

module.exports = {
  BOT_ACCOUNT_BLUEPRINTS,
  BOT_SHARED_PASSWORD,
  BOT_STYLE_PRESETS,
  ensureSystemBotUsers,
  getAvailableSystemBots,
  getBotSeatCap,
  getBotStyleProfile,
  getSystemBotUsernames,
  topUpBotBankroll,
};
