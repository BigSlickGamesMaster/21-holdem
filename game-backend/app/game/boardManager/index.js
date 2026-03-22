/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
const { PokerFinishGame, PokerBoard, Setting, User, Analytics } = require('../../models');
const { redis, mongodb, deck } = require('../../utils');
const PokerJackBoard = require('./pokerjack/Board');

class BoardManager {
  constructor() {
    this.oDefaultSetting = {
      nInitializeTimer: 10000,
      nMaxWaitingTime: 60000,
      nMaxTurnMissAllowed: 2,
      nTurnBuffer: 1000,
      nRoundStartsIn: 6000,
    };
    this.oTableClasses = {};

    emitter.on('assignTurnTimeout', this.schedular.bind(this, 'assignTurnTimeout'));
    emitter.on('initializeGame', this.schedular.bind(this, 'initializeGame'));
    emitter.on('refundOnLongWait', this.schedular.bind(this, 'refundOnLongWait'));
    emitter.on('resetTable', this.schedular.bind(this, 'resetTable'));
    emitter.on('finishGame', this.schedular.bind(this, 'finishGame'));
    emitter.on('takeTurn', this.schedular.bind(this, 'takeTurn'));

    emitter.on('saveBoardHistory', this.saveBoardHistory.bind(this));
    emitter.on('flushBoard', this.flushBoard.bind(this));

    emitter.on('reqLeave', this.customQueue.bind(this));
    emitter.on('custom', this.customQueue.bind(this));
  }

  async customQueue(oData, callback) {
    try {
      await this.scheduleTask(oData.sEventName, oData.iBoardId, oData.iUserId);
    } catch (error) {
      log.red(error);
    } finally {
      callback();
    }
  }

  async createBoard(oProtoData, options = {}) {
    try {
      const tableSettings = {
        ...this.oDefaultSetting,
        nTurnTime: oProtoData.nTurnTime * 1000 || 20000,
        ...(options.oSetting || {}),
      };

      const oBoardData = {
        _id: mongodb.mongify(),
        iProtoId: _.toString(oProtoData._id),
        nMinBuyIn: oProtoData.nMinBuyIn ?? 0,
        // nMaxBuyIn: oProtoData.nMaxBuyIn ?? 0,
        // nMaxTableAmount: oProtoData.nMaxTableAmount ?? 0,
        nMinBet: oProtoData.nMinBet ?? 0,
        nMaxBet: oProtoData.nMaxBet ?? 0,
        nMaxPlayer: oProtoData.nMaxPlayer,
        iUserTurn: '',
        eState: 'waiting',
        eTableMode: options.eTableMode || oProtoData.eTableMode || 'live',
        ePokerType: oProtoData.ePokerType || 'pokerJack',
        oSocketId: {},
        aDeck: deck.getDeck(1),
        oTutorial: options.oTutorial || null,
        oSetting: { ...tableSettings },
        oGameInfo: {
          nTableEntryFee: oProtoData.nMinBuyIn,
          nMinChips: oProtoData.nMinChips,
          nMaxPlayer: oProtoData.nMaxPlayer,
          nSmallBlindAmount: oProtoData.nMinBet,
          nBigBlindAmount: oProtoData.nMinBet * 2,
        },
      };

      if (oProtoData.eBoardType === 'private') oBoardData.sPrivateCode = _.randomizeNumericString(8, 99999).pop();

      const boardClass = this.generateClass(oBoardData);
      this.oTableClasses[boardClass._id] = boardClass;

      await boardClass.save();
      log.yellow('## boardClass generated.');
      return boardClass;
    } catch (error) {
      console.log('error from createBoard :: ', error);
    }
  }

  schedular(sTaskName, message) {
    const { iBoardId, iUserId } = message;
    this.scheduleTask(sTaskName, iBoardId, iUserId);
  }

  async scheduleTask(sTaskName, iBoardId, iUserId) {
    const board = await this.getBoard(iBoardId);
    if (!board) return false;

    const participant = iUserId ? board.getParticipant(iUserId) : undefined;
    switch (sTaskName) {
      case 'assignTurnTimeout':
        if (!participant) return log.red(sTaskName, ' => ', messages.not_found('participant').message);
        participant.turnMissed();
        break;
      case 'initializeGame':
        board.initializeGame();
        break;
      case 'finishGame':
        board.finishGame(iUserId);
        break;
      case 'reqLeave':
        await participant.leave();
        break;
      case 'refundOnLongWait':
        board.refundOnLongWait();
        break;
      case 'takeTurn':
        if (!participant) return log.red(sTaskName, ' => ', messages.not_found('participant').message);
        participant.takeTurn();
        break;
      case 'resetTable':
        board.resetTable();

        // log.blue('resetTable --> saveTableHistory :: ', board._id);
        // this.saveBoardHistory(board._id, () => board.resetTable());
        break;
      default:
        log.red('case did not matched', sTaskName);
        break;
    }
  }

  generateClass(oBoardData) {
    log.cyan('Very Bad 🚀 ~ file: index.js:141 ~ BoardManager ~ generateClass ~ oBoardData:', oBoardData.ePokerType);
    let boardClass;
    switch (oBoardData.ePokerType) {
      case 'pokerJack':
        boardClass = new PokerJackBoard(oBoardData);
        break;
      default:
        log.red('Invalid boardType while generating class');
        break;
    }
    return boardClass;
  }

  async saveBoardHistory(iBoardId, callback) {
    try {
      const board = await this.getBoard(iBoardId);
      if (!board) return false;

      const oBoardJSON = board.toJSON();

      const aLog = await redis.client.json.GET(_.getBoardLogsKey(iBoardId));
      const keys = await redis.client.keys(_.getBoardLogsKey(iBoardId));
      await redis.client.unlink(keys);
      board.aLog = aLog.length ? aLog : [];

      await PokerFinishGame.insertMany([
        {
          iBoardId,
          iProtoId: oBoardJSON.iProtoId,
          aParticipant: oBoardJSON.aParticipant,
          aCommunityCard: oBoardJSON.aCommunityCard,
          iDealerId: oBoardJSON.iDealerId,
          iSmallBlindId: oBoardJSON.iSmallBlindId,
          iBigBlindId: oBoardJSON.iBigBlindId,
          aLog: board.aLog,
          eState: oBoardJSON.eState,
          ePokerType: oBoardJSON.ePokerType,
          nTableRound: oBoardJSON.nTableRound,
          nGameRound: oBoardJSON.nGameRound,
          nTableChips: oBoardJSON.nTableChips,
          nMaxPlayer: oBoardJSON.nMaxPlayer,
          nMinBet: oBoardJSON.nMinBet,
          nMaxBet: oBoardJSON.nMaxBet,
          sPrivateCode: oBoardJSON.sPrivateCode,
          nRakeAmount: (await Setting.findOne({}, { _id: 0, nRakeAmount: 1 }).lean()).nRakeAmount,
        },
      ]);

      // callback();
    } catch (error) {
      log.red(`save history :: ${error}`);
    }
  }

  async flushBoard({ iBoardId, iProtoId }) {
    try {
      await PokerFinishGame.findOneAndUpdate({ iBoardId, iProtoId }, { $set: { eState: 'finished' } });

      const board = await this.getBoard(iBoardId);
      if (!board) return false;
      const query = { iBoardId };
      if (board.sPrivateCode) {
        query.sPrivateCode = board.sPrivateCode;

        const aParticipantUserIds = [];
        for (const participant of board.aParticipant) aParticipantUserIds.push(participant.iUserId);
        await User.updateMany({ _id: { $in: aParticipantUserIds } }, { $unset: { sPrivateCode: 1 }, $pull: { aPokerBoard: iBoardId } });
      } else query.iProtoId = board.iProtoId;
      await PokerBoard.deleteOne(query);

      await redis.client.unlink(_.getBoardKey(iBoardId));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const participant of board.aParticipant) {
        if (participant.dGameStartedAt == 0) continue;
        await Analytics.findOneAndUpdate(
          { iUserId: participant.iUserId, dCreatedDate: { $gte: today } },
          { $inc: { nInGameTime: Math.floor((Date.now() - participant.dGameStartedAt) / 1000) } },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    } catch (error) {
      log.red(`flushBoard error: ${error}`);
    }
  }

  async getBoard(iBoardId) {
    const key = _.getBoardKey(iBoardId);
    const oTableData = await redis.client.json.GET(key);
    if (!oTableData) return false;

    const aParticipant = [];
    for (const [boardKey, value] of Object.entries(oTableData)) {
      if (boardKey === 'aParticipant' && Array.isArray(value)) {
        for (const participant of value) if (participant && typeof participant === 'object') aParticipant.push(participant);
        continue;
      }
      if ((boardKey.startsWith('aParticipant_') || boardKey.startsWith('aParticipant-')) && value && typeof value === 'object') {
        aParticipant.push(value);
      }
    }

    const oParticipantByUserId = {};
    for (const participant of aParticipant) {
      const sUserId = _.toString(participant?.iUserId);
      if (!sUserId) continue;
      oParticipantByUserId[sUserId] = participant;
    }

    oTableData.aParticipant = Object.values(oParticipantByUserId);
    oTableData.aParticipant.sort((a, b) => a?.nSeat - b?.nSeat);
    return iBoardId in this.oTableClasses ? this.oTableClasses[iBoardId].updateClass(oTableData) : this.generateClass(oTableData);
  }

  async addParticipant(oData) {
    const board = await this.getBoard(oData.iBoardId);
    if (!board) return false;
    if (!board || board.aParticipant.length === board.nMaxPlayer) {
      const newBoard = await this.createBoard(oData.oProtoData);
      return newBoard.addParticipant(oData.oUserData);
    }
    return board.addParticipant(oData.oUserData);
  }
}

module.exports = new BoardManager();
