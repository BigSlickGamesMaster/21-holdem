const { User, PokerBoard, Analytics, Transaction } = require('../../../../../models');
const { redis } = require('../../../../../utils');

class Service {
  constructor(oParticipantData, oBoard) {
    this.iUserId = _.toString(oParticipantData.iUserId);
    this.sUserName = oParticipantData.sUserName;
    this.eUserType = oParticipantData.eUserType ?? 'user';
    this.sTutorialRole = oParticipantData.sTutorialRole ?? '';
    this.nSeat = oParticipantData.nSeat;
    this.aCardHand = oParticipantData.aCardHand ?? [];
    this.eState = oParticipantData.eState;
    this.nChips = oParticipantData.nChips;
    this.nTurnMissed = oParticipantData.nTurnMissed ?? 0;
    this.bNextTurnLeave = oParticipantData.bNextTurnLeave ?? false;
    this.aUserAction = oParticipantData.aUserAction ?? ['c', 'r', 'f', 'd'];
    this.isDoubleDownLock = oParticipantData.isDoubleDownLock ?? false;
    this.isAllInLock = oParticipantData.isAllInLock ?? false;
    this.nCardScore = oParticipantData.nCardScore ?? 0;
    this.sAvatar = oParticipantData.sAvatar ?? '';
    this.bHasAceAndBust = oParticipantData.bHasAceAndBust ?? false;
    this.nLastBidChips = oParticipantData.nLastBidChips ?? 0;
    this.nTotalBidChips = oParticipantData.nTotalBidChips ?? 0;
    this.nStandAtRound = oParticipantData.nStandAtRound;
    this.nWinningAmount = oParticipantData.nWinningAmount ?? 0;
    this.nPlayerTurnCount = oParticipantData.nPlayerTurnCount ?? 0;
    this.dGameStartedAt = oParticipantData.dGameStartedAt ?? Date.now();
    this.oBoard = oBoard;
  }

  get gameState() {
    return this.oBoard.toJSON();
  }

  get sRootSocket() {
    return this.oBoard?.oSocketId ? this.oBoard?.oSocketId[this.iUserId] : null;
  }

  stateHandler() {
    if (['playing', 'initialized', 'finished'].includes(this.oBoard.eState)) return this.sendTurnInfo();
  }

  async sendTurnInfo() {
    const { nTurnTime, nTurnBuffer } = this.oBoard.oSetting;
    const bTutorialTurn = this.oBoard?.isTutorialTable?.() === true;
    const bCheckOpenState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
    const toCallAmount = bCheckOpenState ? 0 : Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0);
    const turnInfo = {
      iUserId: this.oBoard.iUserTurn,
      nTotalTurnTime: bTutorialTurn ? null : nTurnTime - nTurnBuffer,
      aUserAction: this.aUserAction,
      nMinBet: this.oBoard.nMinBet,
      toCallAmount,
    };

    const [ttl, nRemainingInitializeTime, nRemainingRoundStartsIn] = await Promise.all([
      this.oBoard.getScheduler('assignTurnTimeout', turnInfo.iUserId),
      this.oBoard.getScheduler('initializeGame'),
      this.oBoard.getScheduler('resetTable'),
    ]);
    if (bTutorialTurn || ttl == null) {
      turnInfo.ttl = null;
    } else {
      turnInfo.ttl = ttl - nTurnBuffer;
      if (turnInfo.ttl < 200) turnInfo.ttl = null;
    }
    turnInfo.nRemainingInitializeTime = nRemainingInitializeTime;
    turnInfo.nRemainingRoundStartsIn = nRemainingRoundStartsIn;
    if (nRemainingRoundStartsIn) turnInfo.nTableChips = 0;
    await this.emit('resPlayerTurn', turnInfo);
  }

  hasValidTurn() {
    return this.iUserId === this.oBoard.iUserTurn;
  }

  async leave() {
    try {
      const leaveOnWaiting = async () => {
        log.yellow('🚀 :: Service :: On leaveOnWaiting:');

        this.eState = 'leave';

        const query = { iBoardId: this.oBoard._id };
        if (this.oBoard.sPrivateCode) {
          query.sPrivateCode = this.oBoard.sPrivateCode;
          await User.updateOne({ _id: this.iUserId }, { $unset: { sPrivateCode: 1 } });
        } else query.iProtoId = this.oBoard.iProtoId;
        const pokerBoard = await PokerBoard.findOneAndUpdate(query, { $pull: { aParticipants: this.iUserId } }, { new: true }).lean();
        if (!pokerBoard) log.red('leaveOnWaiting :: Board not found while leaving');

        await redis.client.json.del(_.getBoardKey(this.oBoard._id), `.aParticipant_${this.iUserId}`);
        await redis.client.json.del(_.getBoardKey(this.oBoard._id), `.aParticipant-${this.iUserId}`);

        this.oBoard.emit('resFoldPlayer', { iUserId: this.iUserId, oLeave: { sReason: 'Self Leave (Leave)', eBehaviour: 'leave' } });

        delete this.oBoard.oSocketId[this.iUserId];
        await this.oBoard.update({ oSocketId: this.oBoard.oSocketId });

        if (pokerBoard.aParticipants.length < 3) {
          await this.oBoard.deleteScheduler('initializeGame', null);
          this.oBoard.emit('resRefundOnLongWait', { message: 'Please wait for other players to join', nMaxWaitingTime: this.oBoard.oSetting.nMaxWaitingTime });
          this.oBoard.setSchedular('refundOnLongWait', '', this.oBoard.oSetting.nMaxWaitingTime);
        }

        if (pokerBoard && !pokerBoard.aParticipants.length) {
          await PokerBoard.deleteOne(query);
          const keys = await redis.client.keys(`${this.oBoard._id}:*`);
          if (keys.length) await redis.client.unlink(keys);
          await this.oBoard.deleteScheduler('refundOnLongWait', '');
        }
      };
      const leaveOnPlaying = async () => {
        log.yellow('🚀 :: Service :: On leaveOnPlaying:');

        const oLeave = { sReason: 'Self Leave (Fold)', eBehaviour: 'leave' };
        if (this.eState === 'fold' || this.eState === 'bust') oLeave.bGameLostUpdated = true;
        this.bNextTurnLeave = true;
        return await this.foldPlayer(oLeave);
      };

      const leaveOnFinished = async () => {
        log.yellow('🚀 :: Service :: On leaveOnFinished:');
        this.eState = 'leave';
        await this.oBoard.update({ aParticipant: [{ iUserId: this.iUserId, eState: this.eState }] });

        const query = { iBoardId: this.oBoard._id };
        if (this.oBoard.sPrivateCode) {
          query.sPrivateCode = this.oBoard.sPrivateCode;
          await User.updateOne({ _id: this.iUserId }, { $unset: { sPrivateCode: 1 } });
        } else query.iProtoId = this.oBoard.iProtoId;
        const pokerBoard = await PokerBoard.findOneAndUpdate(query, { $pull: { aParticipants: this.iUserId } }, { new: true }).lean();
        if (!pokerBoard) log.red('leaveOnFinished :: Board not found while leaving');

        await redis.client.json.del(_.getBoardKey(this.oBoard._id), `.aParticipant_${this.iUserId}`);
        await redis.client.json.del(_.getBoardKey(this.oBoard._id), `.aParticipant-${this.iUserId}`);

        this.oBoard.emit('resFoldPlayer', { iUserId: this.iUserId, oLeave: { sReason: 'Self Leave (Leave)', eBehaviour: 'leave' } });

        delete this.oBoard.oSocketId[this.iUserId];
        await this.oBoard.update({ oSocketId: this.oBoard.oSocketId });

        if (pokerBoard.aParticipants.length < 3) {
          await this.oBoard.deleteScheduler('initializeGame', null);
          this.oBoard.emit('resRefundOnLongWait', { message: 'Please wait for other players to join', nMaxWaitingTime: this.oBoard.oSetting.nMaxWaitingTime });
          this.oBoard.setSchedular('refundOnLongWait', '', this.oBoard.oSetting.nMaxWaitingTime);
        }

        if (pokerBoard && !pokerBoard.aParticipants.length) {
          await PokerBoard.deleteOne(query);
          const keys = await redis.client.keys(`${this.oBoard._id}:*`);
          if (keys.length) await redis.client.unlink(keys);
          await this.oBoard.deleteScheduler('refundOnLongWait', '');
        }
      };

      await User.updateOne({ _id: this.iUserId }, { $pull: { aPokerBoard: this.oBoard._id } });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (this.dGameStartedAt !== 0) {
        await Analytics.findOneAndUpdate(
          { iUserId: this.iUserId, dCreatedDate: { $gte: today } },
          { $inc: { nInGameTime: Math.floor((Date.now() - this.dGameStartedAt) / 1000) } },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      if (this.oBoard.eState === 'initialized') return await leaveOnWaiting();
      if (this.eState === 'waiting' && this.oBoard.eState === 'waiting') return await leaveOnWaiting();
      if (this.eState !== 'leave' && this.eState !== 'waiting' && this.oBoard.eState === 'playing') return await leaveOnPlaying();
      if (this.oBoard.eState === 'finished') return await leaveOnFinished();
    } catch (error) {
      console.log('error from leave :: ', error);
    }
  }

  async foldPlayer(oLeave = {}) {
    try {
      log.yellow('🚀 :: Service :: foldPlayer :: foldPlayer:', oLeave.eBehaviour);

      const bWasCurrentTurn = this.hasValidTurn();
      this.eState = oLeave.eBehaviour;
      this.bNextTurnLeave = oLeave.eBehaviour === 'leave';

      if (bWasCurrentTurn && (this.eState === 'fold' || this.eState === 'leave')) await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);
      await this.oBoard.emit('resFoldPlayer', { iUserId: this.iUserId, oLeave });

      await this.oBoard.update({ aParticipant: [this.toJSON()] });
      await this.oBoard.saveLogs([{ sAction: oLeave.eBehaviour, eLogType: 'game', iUserId: this.iUserId, oGameData: { ...oLeave } }]);

      if (this.eState === 'fold' || this.eState === 'bust' || !oLeave.bGameLostUpdated) await this.updateUser({ $inc: { nGameLost: 1 } });

      if (this.eState === 'leave') {
        delete this.oBoard.oSocketId[this.iUserId];
        await this.oBoard.update({ oSocketId: this.oBoard.oSocketId });

        const playingPlayers = this.oBoard.aParticipant.filter(e => e.eState === 'playing');
        if (playingPlayers.length === 1) return await this.oBoard.declareResult(playingPlayers, 'FoldPlayer(leave): 1 player leave');
      }

      if (bWasCurrentTurn && (this.eState === 'fold' || this.eState === 'leave')) return await this.passTurn();
    } catch (error) {
      console.log('error from foldPlayer :: ', error);
    }
  }

  async creditChips(nWinningAmount) {
    await this.updateUser({ $inc: { nChips: nWinningAmount } });
  }

  async updateUser(updateQuery) {
    if (!this.shouldPersistFinancialState()) return null;
    return await User.findOneAndUpdate({ _id: this.iUserId }, updateQuery, { new: true });
  }

  async recordTransaction(transactionData) {
    if (!this.shouldPersistFinancialState()) return null;
    return await Transaction.create(transactionData);
  }

  shouldPersistFinancialState() {
    return this.oBoard?.isLiveTable?.() !== false;
  }

  isGuestUser() {
    return this.eUserType === 'guest';
  }

  isBotUser() {
    return this.eUserType === 'bot';
  }

  isAutomatedPlayer() {
    return this.isBotUser() && this.oBoard?.isGuestTable?.() === true;
  }

  getTutorialActionError(sRequestedAction, oData = {}) {
    if (!this.oBoard?.isTutorialTable?.() || !this.isGuestUser()) return null;
    const sExpectedAction = this.oBoard.getTutorialExpectedUserAction?.();
    if (!sExpectedAction) return null;

    const sNormalizedAction = sRequestedAction === 'call' && oData?.bTakeCard === false ? 'stand' : sRequestedAction;
    if (sNormalizedAction === sExpectedAction) return null;

    const oActionLabels = {
      call: 'Call',
      stand: 'Call/Stand',
      doubleDown: 'Double Down',
      raise: 'Raise',
      check: 'Check',
      fold: 'Fold',
    };

    return `Tutorial step: use ${oActionLabels[sExpectedAction] || sExpectedAction}.`;
  }

  async emit(sEventName, oData) {
    if (!sEventName) return log.red(`emit :: Event name is required :: ${sEventName}`);
    if (global.io.to(this.sRootSocket)) global.io.to(this.sRootSocket).emit(this.oBoard._id, { sEventName, oData });
  }

  toJSON() {
    return _.pick(this, [
      //
      'iUserId',
      'sUserName',
      'eUserType',
      'sTutorialRole',
      'nSeat',
      'nChips',
      'aCardHand',
      'nTurnMissed',
      'eState',
      'bNextTurnLeave',
      'aUserAction',
      'isDoubleDownLock',
      'isAllInLock',
      'nCardScore',
      'sAvatar',
      'bHasAceAndBust',
      'sRootSocket',
      'nLastBidChips',
      'nTotalBidChips',
      'nStandAtRound',
      'nWinningAmount',
      'nPlayerTurnCount',
      'dGameStartedAt',
    ]);
  }
}

module.exports = Service;
