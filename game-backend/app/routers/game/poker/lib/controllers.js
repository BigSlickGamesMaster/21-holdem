const _ = require('../../../../../globals/lib/helper');
const boardManager = require('../../../../game/boardManager');
const { BoardProtoType, User, PokerBoard } = require('../../../../models');
const middleware = require('./middlewares');

const controllers = {};

async function seedGuestBots({ board, boardProto, count }) {
  if (!count) return;

  const bots = await middleware.createGuestBotUsers(count, boardProto.nMinBuyIn);
  for (const bot of bots) {
    await PokerBoard.updateOne({ iBoardId: board._id }, { $addToSet: { aParticipants: bot._id } });
    await User.updateOne({ _id: bot._id }, { $addToSet: { aPokerBoard: board._id } });
    await boardManager.addParticipant({
      iBoardId: board._id,
      oProtoData: boardProto,
      oUserData: {
        ...bot.toObject(),
        nMinBuyIn: boardProto.nMinBuyIn,
      },
    });
  }
}

async function ensureGuestBoardCanStart(board) {
  const refreshedBoard = await boardManager.getBoard(board._id.toString());
  if (!refreshedBoard) return board;

  const nReadyParticipants = refreshedBoard.aParticipant.filter(participant => participant.eState !== 'leave').length;
  if (nReadyParticipants < 3 || refreshedBoard.eState === 'playing') return refreshedBoard;

  const [nRemainingInitializeTime, nRemainingResetTime] = await Promise.all([
    refreshedBoard.getScheduler('initializeGame'),
    refreshedBoard.getScheduler('resetTable'),
  ]);

  if (!nRemainingInitializeTime && !nRemainingResetTime) {
    await refreshedBoard.deleteScheduler('refundOnLongWait', '');
    await refreshedBoard.setSchedular('initializeGame', null, refreshedBoard.oSetting.nInitializeTimer);
  }

  return refreshedBoard;
}

controllers.listBoard = async (req, res) => {
  try {
    const query = { eStatus: 'y' };
    const project = {
      sName: 1,
      nMinBet: 1,
      // nMaxTableAmount: 1,
      nMinBuyIn: 1,
      // nMaxBuyIn: 1,
      nMaxPlayer: 1,
    };

    const aProtoData = await BoardProtoType.find(query, project).sort({ nMinBet: 1 }).lean();

    return res.reply(messages.success(), aProtoData);
  } catch (error) {
    return res.reply(messages.server_error(), error);
  }
};

controllers.joinBoard = async (req, res) => {
  try {
    if (!req.board) return res.reply(messages.custom.table_not_found);
    const params = {
      iBoardId: req.board._id,
      oProtoData: req.boardProto,
      oUserData: {
        ...req.user,
        nMinBuyIn: req.boardProto.nMinBuyIn,
      },
    };
    const response = await boardManager.addParticipant(params);
    if (!response) return res.reply(messages.not_found('board'));

    await User.updateOne({ _id: req.user._id }, { $addToSet: { aPokerBoard: req.board._id } });

    return res.reply(messages.success(), response);
  } catch (error) {
    console.log('🚀 :: controllers.joinTable= :: error:', error);
    return res.reply(messages.server_error('joinBoard'), error.toString());
  }
};

controllers.leaveBoard = async (req, res) => {
  try {
    if (!req.user.aPokerBoard.length) return res.reply(messages.notFoundCM('Table has been Expired/ Completed!'));
    const activeBoardId = req.user.aPokerBoard[0].toString();
    const activeBoard = await boardManager.getBoard(activeBoardId);
    const participant = activeBoard?.getParticipant?.(req.user._id.toString());
    if (!activeBoard || !participant) {
      await User.updateOne({ _id: req.user._id }, { $pull: { aPokerBoard: activeBoardId } });
      await PokerBoard.updateMany({ iBoardId: activeBoardId }, { $pull: { aParticipants: req.user._id } });
      return res.reply(messages.successCM('Player left the table successfully'));
    }

    emitter.emit('reqLeave', { sEventName: 'reqLeave', iBoardId: activeBoardId, iUserId: req.user._id.toString() }, _.emptyCallback);

    return res.reply(messages.successCM('Player left the table successfully'));
  } catch (error) {
    return res.reply(messages.server_error('leaveBoard'), error.toString());
  }
};

async function getActiveGuestBoard(req, res) {
  if (!req.user?.aPokerBoard?.length) {
    res.reply(messages.notFoundCM('Table has been Expired/ Completed!'));
    return null;
  }

  const activeBoardId = req.user.aPokerBoard[0].toString();
  const board = await boardManager.getBoard(activeBoardId);
  const participant = board?.getParticipant?.(req.user._id.toString());

  if (!board || !participant) {
    await User.updateOne({ _id: req.user._id }, { $pull: { aPokerBoard: activeBoardId } });
    await PokerBoard.updateMany({ iBoardId: activeBoardId }, { $pull: { aParticipants: req.user._id } });
    res.reply(messages.notFoundCM('Table has been Expired/ Completed!'));
    return null;
  }

  if (!board.isGuestTable?.()) {
    res.reply(messages.unauthorized());
    return null;
  }

  return { board, participant };
}

controllers.pauseGuestBoard = async (req, res) => {
  try {
    const oBoardContext = await getActiveGuestBoard(req, res);
    if (!oBoardContext) return;

    const { board } = oBoardContext;
    const oGuestPause = await board.pauseGuestGame(req.user._id.toString());
    return res.reply(messages.success(), {
      bPaused: !!oGuestPause?.bActive,
      oGuestPause,
    });
  } catch (error) {
    return res.reply(messages.server_error('pauseGuestBoard'), error.toString());
  }
};

controllers.resumeGuestBoard = async (req, res) => {
  try {
    const oBoardContext = await getActiveGuestBoard(req, res);
    if (!oBoardContext) return;

    const { board } = oBoardContext;
    const oGuestPause = await board.resumeGuestGame(req.user._id.toString());
    return res.reply(messages.success(), {
      bPaused: !!oGuestPause?.bActive,
      oGuestPause,
    });
  } catch (error) {
    return res.reply(messages.server_error('resumeGuestBoard'), error.toString());
  }
};

controllers.joinGuestBoard = async (req, res) => {
  try {
    if (!req.board) return res.reply(messages.custom.table_not_found);
    if (req.existingGuestParticipant) {
      if (req.shouldSeedGuestBots) {
        await seedGuestBots({ board: req.board, boardProto: req.boardProto, count: req.guestBotCount || 0 });
      }
      req.board = await ensureGuestBoardCanStart(req.board);
      req.existingGuestParticipant = req.board.getParticipant(req.user._id.toString()) || req.existingGuestParticipant;
      return res.reply(messages.success(), {
        iBoardId: req.board._id,
        eState: req.board.eState,
        nChips: req.existingGuestParticipant.nChips,
        sPrivateCode: req.board.sPrivateCode,
        nTotalParticipant: req.board.aParticipant.length,
        eBoardType: req.board.eBoardType,
      });
    }
    const params = {
      iBoardId: req.board._id,
      oProtoData: req.boardProto,
      oUserData: {
        ...req.user,
        nMinBuyIn: req.boardProto.nMinBuyIn,
      },
    };
    const response = await boardManager.addParticipant(params);
    if (!response) return res.reply(messages.not_found('board'));

    await User.updateOne({ _id: req.user._id }, { $addToSet: { aPokerBoard: req.board._id } });

    if (req.shouldSeedGuestBots) {
      await seedGuestBots({ board: req.board, boardProto: req.boardProto, count: req.guestBotCount || 0 });
    }

    req.board = await ensureGuestBoardCanStart(req.board);

    return res.reply(messages.success(), response);
  } catch (error) {
    console.log('joinGuestBoard error:', error);
    return res.reply(messages.server_error('joinGuestBoard'), error.toString());
  }
};

module.exports = controllers;
