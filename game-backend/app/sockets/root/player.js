const boardManager = require('../../game/boardManager');
const { User, PokerBoard, Analytics } = require('../../models');
const PlayerListener = require('./listener');

class Player {
  constructor(socket) {
    this.socket = socket;
    this.iUserId = socket.user.iUserId;
    this.board = null;
    this.setEventListeners();
  }

  setEventListeners() {
    this.socket.on('ping', this.ping.bind(this));
    this.socket.on('disconnect', this.disconnect.bind(this));
    this.socket.on('reqJoinBoard', this.joinBoard.bind(this));
    this.socket.on('error', error => log.red('socket error', error));
  }

  ping(body, callback) {
    callback(null, {});
  }

  async joinBoard({ iBoardId, isReconnect }, callback) {
    log.green('Room Join Called:::::::', iBoardId);
    if (!iBoardId) return this.logError(messages.required_field('board id'), callback);

    const board = await boardManager.getBoard(iBoardId);
    if (!board) return callback({ error: null, oData: { messages: 'Table has been Expired/ Completed!', eState: 'finished', bGameIsFinished: true } });

    this.board = board;

    const participant = board.getParticipant(this.iUserId);
    if (!participant) {
      await Promise.all([
        User.updateOne({ _id: this.iUserId }, { $pull: { aPokerBoard: iBoardId } }),
        this.cleanupStaleBoardParticipant(iBoardId),
      ]);
      return callback({ error: null, oData: { messages: 'Table has been Expired/ Completed!', eState: 'finished', bGameIsFinished: true } });
    }

    const sPreviousSocketId = board?.oSocketId?.[participant.iUserId];

    // * reconnection flag from BE side
    if (sPreviousSocketId && sPreviousSocketId !== this.socket.id) {
      log.white('participant :: reconnected', participant.iUserId, 'userName', participant.sUserName);
      isReconnect = true;
    } else {
      isReconnect = false;
      log.white('participant :: joined', participant.iUserId, 'userName', participant.sUserName);
    }

    if (!this.socket.eventNames().includes(iBoardId)) {
      const playerListener = new PlayerListener(iBoardId, participant.iUserId);
      this.socket.on(iBoardId, playerListener.onEvent.bind(playerListener));
    }

    if (isReconnect && sPreviousSocketId && sPreviousSocketId !== this.socket.id) participant.emit('disconnect', { iUserId: participant.iUserId });

    if (isReconnect && participant.eState !== 'leave') {
      participant.dGameStartedAt = Date.now();
      await board.update({ aParticipant: [participant.toJSON()] });
    }

    if (!board.oSocketId) board.oSocketId = {};
    board.oSocketId[participant.iUserId] = this.socket.id;

    await board.update({ oSocketId: board.oSocketId });

    callback({ error: null, oData: participant.gameState });
    if (!isReconnect) {
      await board.emit('resUserJoined', participant.toJSON());

      const nRemainingInitializeTime = await board.getScheduler('initializeGame');
      if (board.aParticipant.length >= 3 && nRemainingInitializeTime > 0) await board.emit('initializeGame', { nInitializeTimer: nRemainingInitializeTime });

      const bResetTable = await board.getScheduler('resetTable');
      if (bResetTable) await participant.emit('initializeGame', { nRoundStartsIn: bResetTable });
    }

    if (isReconnect) participant.stateHandler();
  }

  logError(error, callback = () => {}) {
    log.trace(error);
    callback({ error });
  }

  async cleanupStaleBoardParticipant(iBoardId) {
    try {
      await PokerBoard.updateMany({ iBoardId }, { $pull: { aParticipants: this.iUserId } });
    } catch (error) {
      log.trace('cleanupStaleBoardParticipant error:::', error);
    }
  }

  async disconnect() {
    try {
      log.red('Root disconnected', this.iUserId, 'with ', this.socket.id);

      if (this.board) {
        const participant = this.board.getParticipant(this.iUserId);
        if (!participant) return log.red('participant not found in disconnect::::', this.iUserId);

        if (participant.eState !== 'leave' && participant.dGameStartedAt !== 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          await Analytics.findOneAndUpdate(
            { iUserId: participant.iUserId, dCreatedDate: { $gte: today } },
            { $inc: { nInGameTime: Math.floor((Date.now() - participant.dGameStartedAt) / 1000) } },
            { upsert: true, setDefaultsOnInsert: true }
          );

          participant.dGameStartedAt = 0;
          await this.board.update({ aParticipant: [participant.toJSON()] });
        }
      }
    } catch (error) {
      log.trace('disconnect error:::', error);
    }
  }
}

module.exports = Player;
