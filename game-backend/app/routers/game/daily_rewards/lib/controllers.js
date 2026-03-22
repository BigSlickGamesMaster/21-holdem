const { User, Setting, Transaction } = require('../../../../models');

const controllers = {};

controllers.getDailyRewards = async (req, res) => {
  try {
    const settings = await Setting.findOne({}, { aDailyReward: true }).lean();

    const user = req.user;
    if (!user.dLastRewardClaimDate) user.dLastRewardClaimDate = null;
    if (!user.nDailyRewardStreak) user.nDailyRewardStreak = 0;

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    const lastClaimDate = new Date(user.dLastRewardClaimDate);
    lastClaimDate.setHours(0, 0, 0, 0);

    const oneDayInMillis = 24 * 60 * 60 * 1000;
    if (lastClaimDate.getTime() > today.getTime() + oneDayInMillis) {
      user.nDailyRewardStreak = 0;
    }

    await User.updateOne({ _id: user._id }, { $set: { nDailyRewardStreak: user.nDailyRewardStreak, dLastRewardClaimDate: user.dLastRewardClaimDate } });

    if (lastClaimDate.getTime() === today.getTime()) user.bTodayRewardClaimed = true;

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastClaimDate = new Date(user.dLastRewardClaimDate);
    lastClaimDate.setHours(0, 0, 0, 0);

    if (lastClaimDate.getTime() === today.getTime()) return res.reply(messages.custom.daily_reward_already_claimed);

    user.nDailyRewardStreak = (user.nDailyRewardStreak % 7) + 1;

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
