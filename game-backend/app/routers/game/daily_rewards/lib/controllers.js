const { User, Setting, Transaction } = require('../../../../models');

const controllers = {};

const ONE_DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

function getStartOfDay(dateValue = new Date()) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
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

    const user = req.user;
    const rewardState = getRewardStreakState(user);
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
      rewards: settings.aDailyReward,
      eligibleDay: (user.nDailyRewardStreak % 7) + 1,
      bTodayRewardClaimed: user.bTodayRewardClaimed || false,
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

    user.nDailyRewardStreak = (rewardState.nDailyRewardStreak % 7) + 1;

    const settings = await Setting.findOne({}, { aDailyReward: true }).lean();
    const reward = settings.aDailyReward[user.nDailyRewardStreak - 1];
    user.nChips += reward;
    user.dLastRewardClaimDate = today;

    await User.updateOne({ _id: user._id }, { $set: { nDailyRewardStreak: user.nDailyRewardStreak, dLastRewardClaimDate: today, nChips: user.nChips } });
    await Transaction.create({ iUserId: user._id, nAmount: reward, eType: 'credit', eMode: 'DR', eStatus: 'Success' });

    return res.reply(messages.custom.daily_reward_claimed, { streak: user.nDailyRewardStreak, reward });
  } catch (error) {
    console.log('claimDailyReward error ::', error);
    return res.reply(messages.server_error('claimDailyReward'));
  }
};

module.exports = controllers;
