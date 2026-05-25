const boardManager = require('../../game/boardManager');
const { queue } = require('../../utils');

const REACTION_EMOJIS = new Set([
  '�',
  '😍',
  '😎',
  '🤑',
  '😤',
  '😱',
  '💪',
  '🔥',
  '💯',
  '👑',
  '🤞',
  '🎉',
]);

class PlayerListener {
  constructor(iBoardId, iUserId) {
    this.iBoardId = iBoardId;
    this.iUserId = iUserId;
  }

  logError(error, callback) {
    return callback({ error });
  }

  async onEvent(oDataa, callback = () => {}) {
    const { sEventName, oData } = typeof oDataa === 'string' ? JSON.parse(oDataa) : oDataa;
    log.cyan('## sEventName in onEvent :: ', sEventName, '::', oData, '::', this.iBoardId);

    const board = await boardManager.getBoard(this.iBoardId);
    if (!board) return this.logError(messages.not_found('Board'), callback);

    const participant = board.getParticipant(this.iUserId);
    if (!participant) return this.logError(messages.not_found('participant'), callback);

    switch (sEventName) {
      case 'reqCall':
        this.call(oData, participant, callback);
        break;
      case 'reqRaise':
        this.raise(oData, participant, callback);
        break;
      case 'reqDoubleDown':
        this.doubleDown(oData, participant, callback);
        break;
      case 'reqFold':
        this.fold(oData, participant, callback);
        break;
      case 'reqStand':
        this.stand(oData, participant, callback);
        break;
      case 'reqLeave':
        this.leave(oData, participant, callback);
        break;
      case 'reqCheck':
        this.check(oData, participant, callback);
        break;
      case 'reqReaction':
        this.reaction(oData, participant, callback);
        break;
      case 'reqSideBets':
        this.sideBets(oData, participant, callback);
        break;
      case 'reqForcePair':
        this.forcePair(oData, participant, callback);
        break;
      default:
        log.red('Unknown event:: ', sEventName);
        callback({ error: `Unknown event:: ${sEventName}` });
        break;
    }
  }

  async call(oData, participant, callback) {
    try {
      log.green('## call table called from user', this.iUserId);
      if (!participant.hasValidTurn()) return this.logError(messages.custom.wait_for_turn, callback);

      participant.call(oData, callback);
    } catch (error) {
      console.log('Error in PlayerListener call method:', error);
      this.logError(error, callback);
    }
  }

  async raise(oData, participant, callback) {
    try {
      log.green('## raise table called from user', this.iUserId);
      if (!participant.hasValidTurn()) return this.logError(messages.custom.wait_for_turn, callback);

      participant.raise(oData, callback);
    } catch (error) {
      console.log('Error in PlayerListener raise method:', error);
      this.logError(error, callback);
    }
  }

  async doubleDown(oData, participant, callback) {
    try {
      log.green('## doubleDown table called from user', this.iUserId);
      if (!participant.hasValidTurn()) return this.logError(messages.custom.wait_for_turn, callback);

      participant.doubleDown(oData, callback);
    } catch (error) {
      console.log('Error in PlayerListener doubleDown method:', error);
      this.logError(error, callback);
    }
  }

  async fold(oData, participant, callback) {
    try {
      log.green('## fold table called from user', this.iUserId);
      if (!participant.hasValidTurn()) return this.logError(messages.custom.wait_for_turn, callback);
      const sTutorialError = participant.getTutorialActionError ? participant.getTutorialActionError('fold', oData) : null;
      if (sTutorialError) return this.logError(sTutorialError, callback);

      if (!oData) oData = {};
      oData.sReason = 'Self Fold';
      oData.eBehaviour = 'fold';
      await participant.foldPlayer(oData, callback);
    } catch (error) {
      console.log('Error in PlayerListener fold method:', error);
      this.logError(error, callback);
    }
  }

  async stand(oData, participant, callback) {
    try {
      log.green('## stand table called from user', this.iUserId);
      if (!participant.hasValidTurn()) return this.logError(messages.custom.wait_for_turn, callback);

      participant.stand(oData, callback);
    } catch (error) {
      console.log('Error in PlayerListener stand method:', error);
      this.logError(error, callback);
    }
  }

  async check(oData, participant, callback) {
    try {
      log.green('## check table called from user', this.iUserId);
      if (!participant.hasValidTurn()) return this.logError(messages.custom.wait_for_turn, callback);

      participant.check(oData, callback);
    } catch (error) {
      console.log('Error in PlayerListener check method:', error);
      this.logError(error, callback);
    }
  }

  async leave(oData, participant, callback) {
    try {
      log.green('## leave table called from user ', this.iUserId);

      await queue.addJob(this.iBoardId, { sEventName: 'reqLeave', iBoardId: this.iBoardId, iUserId: this.iUserId });
    } catch (error) {
      console.log('Error in PlayerListener leave method:', error);
      this.logError(error, callback);
    }
  }

  async reaction(oData, participant, callback) {
    try {
      const sEmoji = typeof oData?.sEmoji === 'string' ? oData.sEmoji.trim() : '';
      if (!REACTION_EMOJIS.has(sEmoji)) return this.logError('Invalid reaction', callback);

      await participant.oBoard.emit('resReaction', {
        iUserId: String(participant.iUserId),
        nSeat: participant.nSeat,
        sEmoji,
      });

      callback(null, { success: true });
    } catch (error) {
      console.log('Error in PlayerListener reaction method:', error);
      this.logError(error, callback);
    }
  }

  async sideBets(oData, participant, callback) {
    try {
      await participant.setSideBets(oData?.bets || {});
      callback(null, { success: true });
    } catch (error) {
      this.logError(error.message || error, callback);
    }
  }

  async forcePair(oData, participant, callback) {
    try {
      const holeCard = participant.aCardHand?.[0];
      if (!holeCard) return callback({ error: 'No hole card to match' });

      const board = participant.oBoard;
      const targetLabel = holeCard.nLabel;

      // Find the last matching card in the deck (pop() takes from the end)
      let matchIndex = -1;
      for (let i = board.aDeck.length - 1; i >= 0; i--) {
        if (board.aDeck[i].nLabel === targetLabel) {
          matchIndex = i;
          break;
        }
      }

      if (matchIndex === -1) {
        log.red('reqForcePair :: no matching card in deck for nLabel', targetLabel);
        return callback(null, { success: false, message: 'No matching card remaining in deck' });
      }

      // Move it to the end so the next pop() returns it
      const [matchCard] = board.aDeck.splice(matchIndex, 1);
      board.aDeck.push(matchCard);

      await board.update({ aDeck: board.aDeck });
      log.green('reqForcePair :: deck reordered, next community card will be nLabel', targetLabel);
      callback(null, { success: true });
    } catch (error) {
      console.log('Error in PlayerListener forcePair method:', error);
      this.logError(error, callback);
    }
  }
}

module.exports = PlayerListener;
