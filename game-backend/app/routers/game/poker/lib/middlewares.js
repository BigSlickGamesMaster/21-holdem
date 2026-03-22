const { default: mongoose } = require('mongoose');
const boardManager = require('../../../../game/boardManager');
const { PokerBoard, User, BoardProtoType } = require('../../../../models');
const { fakeUser, redis } = require('../../../../utils');

const middleware = {};
const GUEST_BOT_COUNT = 2;
const GUEST_TUTORIAL_BOT_COUNT = 2;
const GUEST_TUTORIAL_TABLE_MODE = 'guest_tutorial';
const MAX_ACTIVE_GUEST_PLAYERS = 3;

async function clearBoardMembership({ iBoardId, iUserId }) {
  await User.updateOne({ _id: iUserId }, { $pull: { aPokerBoard: iBoardId } });
  await PokerBoard.updateMany({ iBoardId }, { $pull: { aParticipants: iUserId } });
}

async function detachBoardParticipant(board, iUserId) {
  const sUserId = _.toString(iUserId);
  if (!board || !sUserId) return;

  board.aParticipant = board.aParticipant.filter(participant => _.toString(participant.iUserId) !== sUserId);

  if (board.oSocketId?.[sUserId]) {
    delete board.oSocketId[sUserId];
    await board.update({ oSocketId: board.oSocketId });
  }

  await Promise.all([
    clearBoardMembership({ iBoardId: board._id, iUserId }),
    redis.client.json.del(_.getBoardKey(board._id), `.aParticipant_${sUserId}`),
    redis.client.json.del(_.getBoardKey(board._id), `.aParticipant-${sUserId}`),
  ]);
}

function getTargetGuestBotCount({ boardProto, guestBotCountOverride, bTutorialMode }) {
  if (bTutorialMode) return GUEST_TUTORIAL_BOT_COUNT;
  return Math.min(guestBotCountOverride || GUEST_BOT_COUNT, Math.max(Number(boardProto?.nMaxPlayer || 0) - 1, 0));
}

function getMissingGuestBotCount({ board, boardProto, guestBotCountOverride, bTutorialMode }) {
  const nTargetGuestBotCount = getTargetGuestBotCount({ boardProto, guestBotCountOverride, bTutorialMode });
  const nCurrentGuestBotCount = board.aParticipant.filter(participant => participant.eUserType === 'bot' && participant.eState !== 'leave').length;
  return Math.max(nTargetGuestBotCount - nCurrentGuestBotCount, 0);
}

middleware.getPrototype = async (req, res, next) => {
  try {
    const { iProtoId } = _.pick(req.body, ['iProtoId']);

    const boardProtoType = await BoardProtoType.findOne({ _id: iProtoId }).lean();
    if (!boardProtoType || boardProtoType.eStatus != 'y') return res.reply(messages.custom.table_not_found);

    req.boardProto = boardProtoType;
    next();
  } catch (error) {
    res.reply(messages.server_error(), error.toString());
  }
};

middleware.joiningProcess = async (req, res, next) => {
  try {
    log.yellow('joining process called :: ');
    if (req.user.aPokerBoard.length) {
      const activeBoardId = req.user.aPokerBoard[0].toString();
      const activeBoard = await boardManager.getBoard(activeBoardId);
      const participant = activeBoard?.getParticipant?.(req.user._id.toString());
      if (!activeBoard || !participant) {
        await User.updateOne({ _id: req.user._id }, { $pull: { aPokerBoard: activeBoardId } });
        await PokerBoard.updateMany({ iBoardId: activeBoardId }, { $pull: { aParticipants: req.user._id } });
        req.user.aPokerBoard = [];
      } else {
        return res.reply(messages.custom.max_board_join_limit);
      }
    }

    const { nChips } = req.user;
    if (nChips < req.boardProto.nMinBuyIn) return res.reply(messages.custom.insufficient_chips);

    const runJoinFlow = async session => {
      const query = { iProtoId: req.boardProto._id, $expr: { $lt: [{ $size: '$aParticipants' }, req.boardProto.nMaxPlayer] } };
      const update = { $addToSet: { aParticipants: req.user._id } };
      const options = session ? { session, new: true } : { new: true };

      let pokerBoard = await PokerBoard.findOneAndUpdate(query, update, options);

      // Self-heal stale mongo board rows that reference missing Redis board state.
      while (pokerBoard) {
        const board = await boardManager.getBoard(pokerBoard.iBoardId.toString());
        if (board) {
          const participant = board.getParticipant(req.user._id.toString());
          if (participant?.eState === 'leave') {
            req.board = await boardManager.createBoard(req.boardProto);
            await new PokerBoard({ iBoardId: req.board._id, iProtoId: req.boardProto._id, aParticipants: [req.user._id] }).save(
              session ? { session } : {}
            );
          } else {
            req.board = board;
          }
          return next();
        }

        log.yellow(`Stale board mapping detected for iBoardId=${pokerBoard.iBoardId}. Cleaning up and retrying join.`);
        await Promise.all([
          PokerBoard.deleteOne({ iBoardId: pokerBoard.iBoardId }, session ? { session } : {}),
          User.updateMany({ aPokerBoard: pokerBoard.iBoardId }, { $pull: { aPokerBoard: pokerBoard.iBoardId } }, session ? { session } : {}),
        ]);

        pokerBoard = await PokerBoard.findOneAndUpdate(query, update, options);
      }

      req.board = await boardManager.createBoard(req.boardProto);
      await new PokerBoard({ iBoardId: req.board._id, iProtoId: req.boardProto._id, aParticipants: [req.user._id] }).save(session ? { session } : {});
      return next();
    };

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const runResult = await runJoinFlow(session);
      await session.commitTransaction();
      return runResult;
    } catch (error) {
      await session.abortTransaction();
      if (error?.message?.includes('Transaction numbers are only allowed on a replica set member or mongos')) {
        log.yellow('Mongo standalone mode detected. Retrying join flow without transaction.');
        return await runJoinFlow(null);
      }
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.log(`${_.now()} joining process failed. reason`, error);
    return res.reply(messages.server_error(), error.toString());
  }
};

middleware.getGuestPrototype = async (req, res, next) => {
  try {
    const { iProtoId } = _.pick(req.body, ['iProtoId']);
    let boardProtoType;
    if (iProtoId) {
      boardProtoType = await BoardProtoType.findOne({ _id: iProtoId }).lean();
    } else {
      boardProtoType = await BoardProtoType.findOne({ eStatus: 'y' }).sort({ nMinBet: 1 }).lean();
    }
    if (!boardProtoType || boardProtoType.eStatus != 'y') return res.reply(messages.custom.table_not_found);

    req.boardProto = boardProtoType;
    next();
  } catch (error) {
    res.reply(messages.server_error(), error.toString());
  }
};

middleware.enableGuestTutorialMode = (req, _res, next) => {
  req.guestBoardMode = GUEST_TUTORIAL_TABLE_MODE;
  req.guestBotCountOverride = GUEST_TUTORIAL_BOT_COUNT;
  req.guestTutorialState = {
    nHandIndex: 0,
    bCompleted: false,
  };
  req.guestTutorialBoardSettings = {
    nInitializeTimer: 1200,
  };
  next();
};

middleware.createPrivateBoard = async (req, res, next) => {
  if (req.user.aPokerBoard.length) return res.reply(messages.custom.max_board_join_limit);

  const { nChips } = req.user;
  if (nChips < req.boardProto.nMinBuyIn) return res.reply(messages.custom.insufficient_chips);

  req.boardProto.eBoardType = 'private';
  req.board = await boardManager.createBoard(req.boardProto, {
    eOpponent: 'user',
  });

  await new PokerBoard({ iBoardId: req.board._id, sPrivateCode: req.board.sPrivateCode, aParticipants: [req.user._id] }).save();

  next();
};

middleware.joinPrivateBoard = async (req, res, next) => {
  try {
    if (req.user.aPokerBoard.length) return res.reply(messages.custom.max_board_join_limit);

    const body = _.pick(req.body, ['sPrivateCode']);
    if (!body.sPrivateCode) return res.reply(messages.required_field('private code is'));

    const { nChips } = req.user;

    const query = { sPrivateCode: body.sPrivateCode };
    const pokerBoard = await PokerBoard.findOne(query);
    if (!pokerBoard) return res.reply(messages.custom.invalid_code);

    const board = await boardManager.getBoard(pokerBoard.iBoardId.toString());
    if (!board) return res.reply(messages.custom.table_not_found);

    const participant = board.getParticipant(req.user._id.toString());
    if (participant) return res.reply(messages.alreadyExistsCM("You're already in this game on another tab."));

    if (nChips < board.nMinBuyIn) return res.reply(messages.custom.insufficient_chips);

    await PokerBoard.updateOne(query, { $addToSet: { aParticipants: req.user._id } });
    req.board = board;

    next();
  } catch (error) {
    log.red(error.toString());
    return res.reply(messages.server_error(), error.toString());
  }
};

middleware.joinGuestBoard = async (req, res, next) => {
  try {
    const eTableMode = req.guestBoardMode || 'guest';
    const bTutorialMode = eTableMode === GUEST_TUTORIAL_TABLE_MODE;
    const getEligibleGuestSeatCount = board => board.aParticipant.filter(participant => participant.eState !== 'leave').length;

    if (req.user.aPokerBoard.length) {
      const activeBoardId = req.user.aPokerBoard[0].toString();
      const activeBoard = await boardManager.getBoard(activeBoardId);
      const participant = activeBoard?.getParticipant?.(req.user._id.toString());
      if (!activeBoard || !participant) {
        await clearBoardMembership({ iBoardId: activeBoardId, iUserId: req.user._id });
        req.user.aPokerBoard = [];
      } else if (activeBoard.eTableMode === eTableMode) {
        if (bTutorialMode && activeBoard?.oTutorial?.bCompleted) {
          await clearBoardMembership({ iBoardId: activeBoardId, iUserId: req.user._id });
          req.user.aPokerBoard = [];
        } else if (!bTutorialMode && participant?.eState === 'spectator') {
          await detachBoardParticipant(activeBoard, req.user._id);
          req.user.aPokerBoard = [];
        } else {
          req.board = activeBoard;
          req.existingGuestParticipant = participant;
          req.guestBotCount = getMissingGuestBotCount({
            board: activeBoard,
            boardProto: req.boardProto,
            guestBotCountOverride: req.guestBotCountOverride,
            bTutorialMode,
          });
          req.shouldSeedGuestBots = req.guestBotCount > 0;
          return next();
        }
      } else {
        return res.reply(messages.custom.max_board_join_limit);
      }
    }

    const candidateBoards = await PokerBoard.find({ iProtoId: req.boardProto._id, eTableMode }).sort({ dUpdatedDate: -1 }).lean();
    for (const pokerBoard of candidateBoards) {
      const board = await boardManager.getBoard(pokerBoard.iBoardId.toString());
      if (!board) {
        await Promise.all([
          PokerBoard.deleteOne({ iBoardId: pokerBoard.iBoardId }),
          User.updateMany({ aPokerBoard: pokerBoard.iBoardId }, { $pull: { aPokerBoard: pokerBoard.iBoardId } }),
        ]);
        continue;
      }

      if (bTutorialMode && board?.oTutorial?.bCompleted) {
        await PokerBoard.deleteOne({ iBoardId: pokerBoard.iBoardId });
        continue;
      }

      const hasGuestPlayer = board.aParticipant.some(participantData => participantData.eUserType !== 'bot');
      const nEligibleGuestSeatCount = getEligibleGuestSeatCount(board);
      if (hasGuestPlayer || nEligibleGuestSeatCount >= MAX_ACTIVE_GUEST_PLAYERS || board.aParticipant.length >= board.nMaxPlayer) continue;

      await PokerBoard.updateOne({ iBoardId: board._id }, { $addToSet: { aParticipants: req.user._id } });
      req.board = board;
      req.guestBotCount = getMissingGuestBotCount({
        board,
        boardProto: req.boardProto,
        guestBotCountOverride: req.guestBotCountOverride,
        bTutorialMode,
      });
      req.shouldSeedGuestBots = req.guestBotCount > 0;
      return next();
    }

    req.board = await boardManager.createBoard(req.boardProto, {
      eTableMode,
      ...(bTutorialMode && { oTutorial: req.guestTutorialState }),
      ...(bTutorialMode && { oSetting: req.guestTutorialBoardSettings }),
    });
    await new PokerBoard({
      iBoardId: req.board._id,
      iProtoId: req.boardProto._id,
      aParticipants: [req.user._id],
      eTableMode,
    }).save();
    req.guestBotCount = getMissingGuestBotCount({
      board: req.board,
      boardProto: req.boardProto,
      guestBotCountOverride: req.guestBotCountOverride,
      bTutorialMode,
    });
    req.shouldSeedGuestBots = req.guestBotCount > 0;
    next();
  } catch (error) {
    log.red(error.toString());
    return res.reply(messages.server_error(), error.toString());
  }
};

middleware.getMissingGuestBotCount = getMissingGuestBotCount;

middleware.createGuestBotUsers = async (count, minBuyIn) => {
  const bots = [];
  for (let i = 0; i < count; i += 1) {
    let createdBot = null;
    for (let attempt = 0; attempt < 10 && !createdBot; attempt += 1) {
      const botSeed = fakeUser.getRandomPlayer();
      const uniqueSuffix = `${Date.now()}${i}${attempt}${_.randomBetween(100, 999)}`;
      botSeed.sUserName = `demo_${botSeed.sUserName}_${uniqueSuffix}`;
      botSeed.sDeviceId = `demo-bot-${uniqueSuffix}`;
      botSeed.eUserType = 'bot';
      botSeed.isEmailVerified = true;
      botSeed.nChips = Math.max(Number(botSeed.nChips) || 0, Number(minBuyIn) || 0);
      try {
        createdBot = await User.create(botSeed);
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
    if (!createdBot) throw new Error('Unable to create guest bot user');
    bots.push(createdBot);
  }
  return bots;
};

module.exports = middleware;
