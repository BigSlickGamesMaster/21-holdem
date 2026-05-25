const { User, Setting, Transaction } = require('../../../../models');

const controllers = {};

const ONE_DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
const REWARD_BOARD_DAYS = 28;
const DEFAULT_DAILY_REWARDS = [100, 200, 300, 400, 500, 750, 1000];
const DAILY_BONUSES = [
  { id: 'jackpot-20k', label: '20K Jackpot', type: 'chips', amount: 20000, minDay: 15 },
  { id: 'double-chips', label: 'x2 Chips', type: 'multiplier', multiplier: 2, minDay: 8 },
  { id: 'bogo-shop', label: 'Shop BOGO', type: 'shop_bogo', minDay: 12 },
  { id: 'bonus-10k', label: '10K Bonus', type: 'chips', amount: 10000, minDay: 18 },
  { id: 'bonus-5k', label: '5K Bonus', type: 'chips', amount: 5000, minDay: 6 },
  { id: 'streak-shield', label: 'Streak Shield', type: 'streak_shield', minDay: 20 },
];

function getStartOfDay(dateValue) {
  if (!arguments.length) dateValue = new Date();
  if (!dateValue) return null;
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getNextStartOfDay(dateValue = new Date()) {
  const date = getStartOfDay(dateValue);
  date.setDate(date.getDate() + 1);
  return date;
}

function getHash(seed = '', initial = 17) {
  return String(seed || '')
    .split('')
    .reduce((accumulator, character) => ((accumulator * 31) + character.charCodeAt(0)) % 2147483647, initial);
}

function getDailyBonusBoard(dateValue = new Date(), rewardCount = REWARD_BOARD_DAYS) {
  const date = getStartOfDay(dateValue);
  const seed = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const boardSize = Math.max(Number(rewardCount) || REWARD_BOARD_DAYS, 1);
  const usedDays = new Set();

  return DAILY_BONUSES.map((bonus, index) => {
    const minDay = Math.max(1, Math.min(Number(bonus.minDay) || 1, boardSize));
    const weightedRange = Math.max(boardSize - minDay + 1, 1);
    let day = minDay + (Math.abs(getHash(`${seed}:${bonus.id}:${index}`, 23)) % weightedRange);

    while (usedDays.has(day) && day < boardSize) day += 1;
    while (usedDays.has(day) && day > minDay) day -= 1;
    usedDays.add(day);

    return {
      ...bonus,
      day,
    };
  });
}

function getRewardForDay(aRewards = [], day = 1) {
  if (!aRewards.length) return 0;
  return Number(aRewards[(Math.max(Number(day) || 1, 1) - 1) % aRewards.length]) || 0;
}

function applyRewardBonus(baseReward = 0, bonus = null) {
  const reward = Number(baseReward) || 0;
  if (!bonus) return { reward, bonusReward: 0, bBonusWon: false, bonus: null };

  if (bonus.type === 'chips') {
    const bonusReward = Number(bonus.amount) || 0;
    return { reward: reward + bonusReward, bonusReward, bBonusWon: true, bonus };
  }

  if (bonus.type === 'multiplier') {
    const multiplier = Math.max(Number(bonus.multiplier) || 1, 1);
    const multipliedReward = Math.round(reward * multiplier);
    return { reward: multipliedReward, bonusReward: Math.max(0, multipliedReward - reward), bBonusWon: true, bonus };
  }

  return { reward, bonusReward: 0, bBonusWon: true, bonus };
}

function getRewardStreakState(user) {
  const today = getStartOfDay();
  const lastClaimDate = getStartOfDay(user.dLastRewardClaimDate);
  const nCurrentStreak = Number(user.nDailyRewardStreak) || 0;

  if (!lastClaimDate) {
    return { today, lastClaimDate: null, nDailyRewardStreak: 0, bTodayRewardClaimed: false, bMissedClaimWindow: false };
  }

  const nDaysSinceLastClaim = Math.floor((today.getTime() - lastClaimDate.getTime()) / ONE_DAY_IN_MILLIS);
  const bTodayRewardClaimed = nDaysSinceLastClaim === 0;
  const bMissedClaimWindow = nDaysSinceLastClaim > 1;

  return {
    today,
    lastClaimDate,
    nDailyRewardStreak: bMissedClaimWindow ? 0 : nCurrentStreak,
    bTodayRewardClaimed,
    bMissedClaimWindow,
  };
}

controllers.getDailyRewards = async (req, res) => {
  try {
    const settings = await Setting.findOne({}, { aDailyReward: true }).lean();
    const aRewards = Array.isArray(settings?.aDailyReward) && settings.aDailyReward.length ? settings.aDailyReward : DEFAULT_DAILY_REWARDS;
    const user = req.user;
    const rewardState = getRewardStreakState(user);
    const aDailyBonuses = getDailyBonusBoard(rewardState.today, REWARD_BOARD_DAYS);
    user.nDailyRewardStreak = rewardState.nDailyRewardStreak;
    user.bTodayRewardClaimed = rewardState.bTodayRewardClaimed;

    if (rewardState.bMissedClaimWindow || !user.nDailyRewardStreak) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { nDailyRewardStreak: rewardState.nDailyRewardStreak },
          ...(rewardState.bMissedClaimWindow ? { $unset: { dLastRewardClaimDate: true } } : {}),
        }
      );
    }

    return res.reply(messages.success(), {
      rewards: aRewards,
      nBoardDays: REWARD_BOARD_DAYS,
      aDailyBonuses,
      eligibleDay: (user.nDailyRewardStreak % REWARD_BOARD_DAYS) + 1,
      bTodayRewardClaimed: user.bTodayRewardClaimed || false,
      dClaimWindowEndsAt: getNextStartOfDay(rewardState.today),
      dNextClaimAt: user.bTodayRewardClaimed ? getNextStartOfDay(rewardState.today) : rewardState.today,
      bMissedClaimWindow: rewardState.bMissedClaimWindow,
    });
  } catch (error) {
    console.log('getDailyRewards error ::', error);
    return res.reply(messages.server_error('getDailyRewards'));
  }
};

controllers.claimDailyReward = async (req, res) => {
  try {
    const user = req.user;
    const rewardState = getRewardStreakState(user);
    const today = rewardState.today;

    if (rewardState.bTodayRewardClaimed) return res.reply(messages.custom.daily_reward_already_claimed);

    const settings = await Setting.findOne({}, { aDailyReward: true }).lean();
    const aRewards = Array.isArray(settings?.aDailyReward) && settings.aDailyReward.length ? settings.aDailyReward : DEFAULT_DAILY_REWARDS;
    user.nDailyRewardStreak = (rewardState.nDailyRewardStreak % REWARD_BOARD_DAYS) + 1;

    const aDailyBonuses = getDailyBonusBoard(today, REWARD_BOARD_DAYS);
    const oBonus = aDailyBonuses.find((bonus) => Number(bonus.day) === Number(user.nDailyRewardStreak)) || null;
    const baseReward = getRewardForDay(aRewards, user.nDailyRewardStreak);
    const rewardResult = applyRewardBonus(baseReward, oBonus);
    const reward = rewardResult.reward;
    const nCurrentChips = Number(user.nChips) || 0;
    const nUpdatedChips = nCurrentChips + reward;
    user.dLastRewardClaimDate = today;

    await User.updateOne({ _id: user._id }, { $set: { nDailyRewardStreak: user.nDailyRewardStreak, dLastRewardClaimDate: today, nChips: nUpdatedChips } });
    await Transaction.create({ iUserId: user._id, nAmount: reward, eType: 'credit', eMode: 'DR', eStatus: 'Success' });

    return res.reply(messages.custom.daily_reward_claimed, {
      streak: user.nDailyRewardStreak,
      nChips: nUpdatedChips,
      reward,
      baseReward,
      bonusReward: rewardResult.bonusReward,
      bBonusWon: rewardResult.bBonusWon,
      bonus: rewardResult.bonus,
      aDailyBonuses,
      eligibleDay: (user.nDailyRewardStreak % REWARD_BOARD_DAYS) + 1,
      bTodayRewardClaimed: true,
      dClaimWindowEndsAt: getNextStartOfDay(today),
      dNextClaimAt: getNextStartOfDay(today),
    });
  } catch (error) {
    console.log('claimDailyReward error ::', error);
    return res.reply(messages.server_error('claimDailyReward'));
  }
};

module.exports = controllers;
