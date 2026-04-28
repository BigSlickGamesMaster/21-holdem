const { StackemRun } = require('../../../../models');

const controllers = {};

function normalizeLimit(value, fallback = 24, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toEntry(run) {
  return {
    _id: run._id,
    adjustedScore: Number(run.nAdjustedScore) || 0,
    bonusMultiplier: Number(run.nBonusMultiplier) || 1,
    buyIn: Number(run.nBuyIn) || 0,
    createdAt: run.dCreatedDate,
    difficulty: run.eDifficulty || 'easy',
    linesCompleted: Number(run.nLinesCompleted) || 0,
    playerName: run.sUserName || 'Player',
    result: run.eResult || 'timeout',
    score: Number(run.nScore) || 0,
    spareSeconds: Number(run.nSpareSeconds) || 0,
    turns: Number(run.nTurns) || 0,
    userId: run.iUserId,
  };
}

controllers.getLeaderboard = async (req, res) => {
  try {
    const limit = normalizeLimit(req.query.limit);
    const runs = await StackemRun.find({})
      .sort({ nAdjustedScore: -1, nLinesCompleted: -1, dCreatedDate: -1 })
      .limit(limit)
      .lean();

    return res.reply(messages.success(), runs.map(toEntry));
  } catch (error) {
    return res.reply(messages.server_error('stackem leaderboard::'), error);
  }
};

controllers.getProfile = async (req, res) => {
  try {
    const recentRuns = await StackemRun.find({ iUserId: req.user._id })
      .sort({ dCreatedDate: -1 })
      .limit(12)
      .lean();

    const aggregate = await StackemRun.aggregate([
      { $match: { iUserId: req.user._id } },
      {
        $group: {
          _id: '$iUserId',
          bestAdjustedScore: { $max: '$nAdjustedScore' },
          bestLinesCompleted: { $max: '$nLinesCompleted' },
          totalRuns: { $sum: 1 },
          totalScore: { $sum: '$nScore' },
          wins: {
            $sum: {
              $cond: [{ $eq: ['$eResult', 'board-sealed'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = aggregate[0] || {
      bestAdjustedScore: 0,
      bestLinesCompleted: 0,
      totalRuns: 0,
      totalScore: 0,
      wins: 0,
    };

    return res.reply(messages.success(), {
      recentRuns: recentRuns.map(toEntry),
      stats,
    });
  } catch (error) {
    return res.reply(messages.server_error('stackem profile::'), error);
  }
};

controllers.saveRun = async (req, res) => {
  try {
    const body = _.pick(req.body, [
      'adjustedScore',
      'bonusMultiplier',
      'buyIn',
      'difficulty',
      'linesCompleted',
      'result',
      'score',
      'spareSeconds',
      'turns',
    ]);

    if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
      return res.reply(messages.required_field('difficulty'));
    }

    if (!['board-sealed', 'bust', 'timeout'].includes(body.result)) {
      return res.reply(messages.required_field('result'));
    }

    const created = await StackemRun.create({
      eDifficulty: body.difficulty,
      eResult: body.result,
      iUserId: req.user._id,
      nAdjustedScore: Number(body.adjustedScore) || 0,
      nBonusMultiplier: Number(body.bonusMultiplier) || 1,
      nBuyIn: Number(body.buyIn) || 0,
      nLinesCompleted: Number(body.linesCompleted) || 0,
      nScore: Number(body.score) || 0,
      nSpareSeconds: Number(body.spareSeconds) || 0,
      nTurns: Number(body.turns) || 0,
      sUserName: req.user.sUserName || 'Player',
    });

    return res.reply(messages.successfully('Stackem run saved'), toEntry(created.toObject()));
  } catch (error) {
    return res.reply(messages.server_error('stackem save run::'), error);
  }
};

module.exports = controllers;
