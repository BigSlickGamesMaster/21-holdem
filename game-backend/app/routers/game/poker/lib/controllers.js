const _ = require('../../../../../globals/lib/helper');
const boardManager = require('../../../../game/boardManager');
const { BoardProtoType, User, PokerBoard } = require('../../../../models');
const middleware = require('./middlewares');

const controllers = {};
const LOBBY_SEED_BUY_INS = [1000, 5000];
const LOBBY_SEED_SEAT_COUNTS = [4, 6, 9];
const LOBBY_SEED_TARGET_PARTICIPANTS = 3;

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

async function seedLiveBots({ board, boardProto, count }) {
  if (!count) return;

  const bots = await middleware.acquireLiveBotUsers({
    count,
    minBuyIn: boardProto.nMinBuyIn,
    excludeUserIds: board.aParticipant.map(participant => participant.iUserId || participant._id),
  });

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

async function ensureLiveBoardCanStart(board) {
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

function getLobbySeedProtoCandidates(aProtoData = []) {
  const oSelectedByKey = {};

  for (const proto of aProtoData) {
    const nMinBuyIn = Number(proto?.nMinBuyIn) || 0;
    const nMaxPlayer = Number(proto?.nMaxPlayer) || 0;
    if (!LOBBY_SEED_BUY_INS.includes(nMinBuyIn) || !LOBBY_SEED_SEAT_COUNTS.includes(nMaxPlayer)) continue;

    const sKey = `${nMinBuyIn}:${nMaxPlayer}`;
    if (!oSelectedByKey[sKey]) oSelectedByKey[sKey] = proto;
  }

  return Object.values(oSelectedByKey).sort((firstProto, secondProto) => {
    const nBuyInDiff = (Number(firstProto?.nMinBuyIn) || 0) - (Number(secondProto?.nMinBuyIn) || 0);
    if (nBuyInDiff) return nBuyInDiff;
    return (Number(firstProto?.nMaxPlayer) || 0) - (Number(secondProto?.nMaxPlayer) || 0);
  });
}

async function ensureLiveLobbySeedBoards(aProtoData = []) {
  const aSeedProtoCandidates = getLobbySeedProtoCandidates(aProtoData);
  if (!aSeedProtoCandidates.length) return;

  for (const proto of aSeedProtoCandidates) {
    const aProtoBoards = await PokerBoard.find({ iProtoId: proto._id, eTableMode: 'live' }).sort({ dUpdatedDate: -1 }).lean();

    let nCurrentParticipantCount = 0;
    let oTargetBoard = null;

    for (const pokerBoard of aProtoBoards) {
      const board = await boardManager.getBoard(pokerBoard.iBoardId.toString());
      if (!board) {
        await Promise.all([
          PokerBoard.deleteOne({ iBoardId: pokerBoard.iBoardId }),
          User.updateMany({ aPokerBoard: pokerBoard.iBoardId }, { $pull: { aPokerBoard: pokerBoard.iBoardId } }),
        ]);
        continue;
      }

      const nBoardParticipantCount = board.aParticipant.filter(participant => participant.eState !== 'leave').length;
      nCurrentParticipantCount += nBoardParticipantCount;

      if (!oTargetBoard && nBoardParticipantCount < Number(board.nMaxPlayer || proto.nMaxPlayer || 0)) {
        oTargetBoard = board;
      }
    }

    const nMissingParticipants = Math.max(LOBBY_SEED_TARGET_PARTICIPANTS - nCurrentParticipantCount, 0);
    if (!nMissingParticipants) continue;

    if (!oTargetBoard) {
      oTargetBoard = await boardManager.createBoard(proto);
      await new PokerBoard({
        iBoardId: oTargetBoard._id,
        iProtoId: proto._id,
        aParticipants: [],
        eTableMode: 'live',
      }).save();
    }

    await seedLiveBots({
      board: oTargetBoard,
      boardProto: proto,
      count: nMissingParticipants,
    });
  }
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
    await ensureLiveLobbySeedBoards(aProtoData);
    const aProtoIds = aProtoData.map(proto => proto._id);

    const aLiveBoardStats = aProtoIds.length
      ? await PokerBoard.aggregate([
        { $match: { iProtoId: { $in: aProtoIds } } },
        {
          $lookup: {
            from: 'users',
            localField: 'aParticipants',
            foreignField: '_id',
            as: 'aParticipantUsers',
          },
        },
        {
          $project: {
            iProtoId: 1,
            nParticipantCount: {
              $size: { $ifNull: ['$aParticipantUsers', []] },
            },
          },
        },
        {
          $group: {
            _id: '$iProtoId',
            nLiveTableCount: { $sum: 1 },
            nLiveParticipants: { $sum: '$nParticipantCount' },
            nActivePlayers: { $max: '$nParticipantCount' },
          },
        },
      ])
      : [];

    const oLiveBoardMap = aLiveBoardStats.reduce((accumulator, liveBoard) => {
      accumulator[liveBoard._id.toString()] = liveBoard;
      return accumulator;
    }, {});

    const aBoardList = aProtoData.map(proto => {
      const oLiveBoard = oLiveBoardMap[proto._id.toString()] || {};

      return {
        ...proto,
        nActivePlayers: oLiveBoard.nActivePlayers || 0,
        nLiveTableCount: oLiveBoard.nLiveTableCount || 0,
        nLiveParticipants: oLiveBoard.nLiveParticipants || 0,
      };
    });

    return res.reply(messages.success(), aBoardList);
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

    req.board = await boardManager.getBoard(req.board._id.toString());
    const nMissingLiveBotCount = middleware.getMissingLiveBotCount({
      board: req.board,
      boardProto: req.boardProto,
    });
    if (nMissingLiveBotCount > 0) {
      await seedLiveBots({
        board: req.board,
        boardProto: req.boardProto,
        count: nMissingLiveBotCount,
      });
    }

    const refreshedBoard = await ensureLiveBoardCanStart(req.board);
    if (refreshedBoard) {
      response.eState = refreshedBoard.eState;
      response.nTotalParticipant = refreshedBoard.aParticipant.length;
    }

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
