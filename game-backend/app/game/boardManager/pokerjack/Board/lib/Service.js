/* eslint-disable no-continue */
const { User } = require('../../../../../models');
const { redis, deck } = require('../../../../../utils');
const Participant = require('../../Participant');

const TUTORIAL_TABLE_MODE = 'guest_tutorial';

function getCardValue(nLabel) {
  if (nLabel === 1) return 11;
  if (nLabel >= 11) return 10;
  return nLabel;
}

function createTutorialCard(nLabel, eSuit, _id) {
  return {
    _id,
    nLabel,
    nValue: getCardValue(nLabel),
    eSuit,
    isJoker: false,
  };
}

const TUTORIAL_HANDS = [
  {
    sKey: 'hand1',
    sExpectedAction: 'call',
    sTitle: 'Hand 1',
    sDescription: 'Match the opening bet with Call so you can see the hand flow safely.',
    aDeckTail: [
      createTutorialCard(10, 'd', 'tutorial-h1-botbb'),
      createTutorialCard(6, 'c', 'tutorial-h1-botsb'),
      createTutorialCard(9, 'h', 'tutorial-h1-guest'),
    ],
    oBotActions: {
      bot_sb: 'fold',
      bot_bb: 'fold',
    },
  },
  {
    sKey: 'hand2',
    sExpectedAction: 'stand',
    sTitle: 'Hand 2',
    sDescription: 'Use Call/Stand to match the bet and freeze your total for the rest of the hand.',
    aDeckTail: [
      createTutorialCard(8, 's', 'tutorial-h2-botbb'),
      createTutorialCard(7, 'd', 'tutorial-h2-botsb'),
      createTutorialCard(10, 'c', 'tutorial-h2-guest'),
    ],
    oBotActions: {
      bot_sb: 'fold',
      bot_bb: 'fold',
    },
  },
  {
    sKey: 'hand3',
    sExpectedAction: 'doubleDown',
    sTitle: 'Hand 3',
    sDescription: 'This hand is scripted to show Double Down. Take one last card and push for 21.',
    aDeckTail: [
      createTutorialCard(13, 'h', 'tutorial-h3-dd-card'),
      createTutorialCard(9, 'c', 'tutorial-h3-botbb'),
      createTutorialCard(6, 'd', 'tutorial-h3-botsb'),
      createTutorialCard(1, 's', 'tutorial-h3-guest'),
    ],
    oBotActions: {},
  },
];

class Service {
  constructor(oBoardData) {
    this._id = oBoardData._id;
    this.iProtoId = oBoardData.iProtoId;
    this.eTableMode = oBoardData.eTableMode ?? 'live';
    this.oTutorial = oBoardData.oTutorial ?? null;
    this.oGuestPause = oBoardData.oGuestPause ?? { bActive: false, aSchedulers: [] };
    this.aParticipant = oBoardData.aParticipant ? oBoardData.aParticipant.map(p => new Participant(p, this)) : [];
    this.aCommunityCard = oBoardData.aCommunityCard ?? []; // max five cards
    this.aDeck = oBoardData.aDeck ?? [];
    this.oSocketId = oBoardData.oSocketId;
    this.eState = oBoardData.eState;
    this.nTableChips = oBoardData.nTableChips ?? 0;
    this.iUserTurn = oBoardData.iUserTurn;
    // this.iUtgId = oBoardData.iUtgId;
    this.iDealerId = oBoardData.iDealerId;
    this.iSmallBlindId = oBoardData.iSmallBlindId;
    this.iBigBlindId = oBoardData.iBigBlindId;
    this.nMinBuyIn = oBoardData.nMinBuyIn ?? 0; // nMinBuyIn ex. 500 user chips for joining table
    this.nMaxBuyIn = oBoardData.nMaxBuyIn ?? 0; // nMaxBuyIn ex. 5000 user chips for joining table
    this.nMaxTableAmount = oBoardData.nMaxTableAmount ?? 0; // nMaxTableAmount ex. 10000 limit for total chips in table
    this.nMinBet = oBoardData.nMinBet ?? 0; // nMinBet ex. 5 user can call/raise starting from nMinBet
    this.nMaxBet = oBoardData.nMaxBet ?? 0; // nMaxBet ex. 500 user can call/raise upto nMaxBet // nMaxBet change according to nTableChips
    this.nMaxPlayer = oBoardData.nMaxPlayer;
    this.nTableRound = oBoardData.nTableRound ?? 1;
    this.nGameRound = oBoardData.nGameRound ?? 1;
    this.ePokerType = oBoardData.ePokerType;
    this.oSetting = oBoardData.oSetting;
    this.sPrivateCode = oBoardData.sPrivateCode;
    this.oGameInfo = oBoardData.oGameInfo;
  }

  async initializeGame() {
    try {
      if (this.aParticipant.length < 3) {
        this.emit('resRefundOnLongWait', { message: 'Please wait for other players to join', nMaxWaitingTime: this.oSetting.nMaxWaitingTime });
        return this.setSchedular('refundOnLongWait', '', this.oSetting.nMaxWaitingTime);
      }

      if (this.isTutorialTable()) this.prepareTutorialHand();

      this.eState = 'playing';
      this.aParticipant = this.aParticipant.map(p => {
        p.eState = 'playing';
        return p;
      });

      let dealer = this.getParticipant(this.iDealerId);
      if (!dealer) dealer = this.getParticipant(this.iSmallBlindId);
      if (!dealer) dealer = this.getParticipant(this.iBigBlindId);
      if (!dealer) dealer = this.aParticipant[0];
      dealer = this.getNextParticipant(dealer?.nSeat);
      this.iUserTurn = dealer?.iUserId;
      this.iDealerId = this.iUserTurn;

      // this.iDealerId = dealer?.iUserId;

      // this.iUtgId = this.getPreviousParticipant(dealer?.nSeat)?.iUserId;
      // this.iUserTurn = this.iUtgId;

      const smallBlind = this.getNextParticipant(dealer?.nSeat);
      this.iSmallBlindId = smallBlind?.iUserId;
      const bigBlind = this.getNextParticipant(smallBlind?.nSeat);
      this.iBigBlindId = bigBlind?.iUserId;

      await this.update({
        iUserTurn: this.iUserTurn,
        // iUtgId: this.iUtgId,
        iDealerId: this.iDealerId,
        iSmallBlindId: this.iSmallBlindId,
        iBigBlindId: this.iBigBlindId,
        eState: this.eState,
        aDeck: this.aDeck,
        oTutorial: this.oTutorial,
        aParticipant: this.aParticipant,
      });
      this.emit('resBoardState', this.toJSON());

      await this.collectBootAmount();
    } catch (error) {
      console.log('initializeGame', error);
    }
  }

  updateClass(oBoardData) {
    try {
      this._id = oBoardData._id;
      this.iProtoId = oBoardData.iProtoId;
      this.eTableMode = oBoardData.eTableMode ?? 'live';
      this.oTutorial = oBoardData.oTutorial ?? null;
      this.oGuestPause = oBoardData.oGuestPause ?? { bActive: false, aSchedulers: [] };
      this.aParticipant = oBoardData.aParticipant ? oBoardData.aParticipant.map(p => new Participant(p, this)) : [];
      this.aCommunityCard = oBoardData.aCommunityCard ?? [];
      this.oSocketId = oBoardData.oSocketId;
      this.eState = oBoardData.eState;
      this.iUserTurn = oBoardData.iUserTurn;
      this.iDealerId = oBoardData.iDealerId;
      // this.iUtgId = oBoardData.iUtgId;
      this.iSmallBlindId = oBoardData.iSmallBlindId;
      this.iBigBlindId = oBoardData.iBigBlindId;
      this.nTableChips = oBoardData.nTableChips ?? 0;
      this.nMinBuyIn = oBoardData.nMinBuyIn ?? 0;
      // this.nMaxBuyIn = oBoardData.nMaxBuyIn ?? 0;
      // this.nMaxTableAmount = oBoardData.nMaxTableAmount ?? 0;
      this.nMinBet = oBoardData.nMinBet ?? 0;
      this.nMaxBet = oBoardData.nMaxBet ?? 0;
      this.nMaxPlayer = oBoardData.nMaxPlayer;
      this.nTableRound = oBoardData.nTableRound ?? 1;
      this.nGameRound = oBoardData.nGameRound ?? 1;
      this.sPrivateCode = oBoardData.sPrivateCode;
      this.ePokerType = oBoardData.ePokerType;
      this.oSetting = oBoardData.oSetting;
      this.oGameInfo = oBoardData.oGameInfo;
      return this;
    } catch (error) {
      console.log('updateClass', error);
    }
  }

  getParticipant(iUserId) {
    try {
      const sUserId = _.toString(iUserId);
      return this.aParticipant.find(p => _.toString(p.iUserId) === sUserId);
    } catch (error) {
      console.log('getParticipant', error);
    }
  }

  getNextParticipant(nSeat) {
    try {
      let participant = this.aParticipant.find(p => p.nSeat > nSeat && p.eState === 'playing');
      if (!participant) participant = this.aParticipant.find(p => p.nSeat < nSeat && p.eState === 'playing');
      if (!participant) return log.red('No next participant found');
      return participant;
    } catch (error) {
      console.log('getNextParticipant', error);
    }
  }

  getPreviousParticipant(nSeat) {
    try {
      let participant = this.aParticipant.find(p => p.nSeat < nSeat && p.eState === 'playing');
      if (!participant) participant = this.aParticipant.find(p => p.nSeat > nSeat && p.eState === 'playing');
      if (!participant) return log.red('No previous participant found');
      return participant;
    } catch (error) {
      console.log('getPreviousParticipant', error);
    }
  }

  async addParticipant(oUserData) {
    log.green('Add Participant in PokerJack Game: ');
    try {
      const _userData = {
        ...oUserData,
        nChips: oUserData.nMinBuyIn,
        iUserId: _.toString(oUserData._id),
        nSeat: this.getEmptySeat(),
        eState: 'waiting',
      };

      const oParticipant = new Participant(_userData, this);
      this.assignTutorialRole(oParticipant);
      this.aParticipant.push(oParticipant);

      log.red('In add participant ::');

      if (this.sPrivateCode) {
        this.oSetting.nMaxWaitingTime = 30 * 60 * 1000;
        await User.updateOne({ _id: oUserData._id }, { $set: { sPrivateCode: this.sPrivateCode } });
      }
      if (this.aParticipant.length === 1) this.setSchedular('refundOnLongWait', '', this.oSetting.nMaxWaitingTime);

      if (this.aParticipant.length === 3) {
        await this.deleteScheduler('refundOnLongWait', '');
        this.eState = 'initialized';
        this.aParticipant.map(p => (p.eState = 'playing'));
        await this.update({ aParticipant: this.aParticipant.map(p => p.toJSON()) });

        const bInitializeTimer = await this.getScheduler('initializeGame');
        const bResetTable = await this.getScheduler('resetTable');
        if (!bInitializeTimer && !bResetTable) await this.setSchedular('initializeGame', null, this.oSetting.nInitializeTimer);
      }

      if (this.aParticipant.length > 3) {
        oParticipant.eState = 'spectator';

        const nRemainingInitializeTime = await this.getScheduler('initializeGame');
        if (nRemainingInitializeTime) await oParticipant.emit('initializeGame', { nInitializeTimer: nRemainingInitializeTime });
      }

      await this.update({ aParticipant: [oParticipant.toJSON()], __debugParticipantWrite: Date.now(), eState: this.eState, oSetting: this.oSetting });

      return {
        iBoardId: this._id,
        eState: this.eState,
        nChips: oParticipant.nChips,
        sPrivateCode: this.sPrivateCode,
        nTotalParticipant: this.aParticipant.length,
        eBoardType: this.eBoardType,
      };
    } catch (error) {
      console.log('error from addParticipant :: ', error);
      return false;
    }
  }

  getEmptySeat() {
    try {
      const aBookedSeat = this.aParticipant.map(p => p.nSeat);
      const aEmptySeat = [];
      for (let i = 0; i < this.nMaxPlayer; i += 1) if (!aBookedSeat.includes(i)) aEmptySeat.push(i);
      if (this.isTutorialTable()) return aEmptySeat[0];
      const randomSeatIndex = _.randomBetween(0, aEmptySeat.length - 1);
      return aEmptySeat[randomSeatIndex];
    } catch (error) {
      console.log('getEmptySeat', error);
    }
  }

  async save(oData = this.toJSON()) {
    try {
      delete oData.aParticipant;
      await redis.client.json.set(_.getBoardKey(this._id), '.', oData);
      return true;
    } catch (error) {
      console.log('save', error);
    }
  }

  async update(oData) {
    try {
      const _key = _.getBoardKey(this._id);
      for (const [field, value] of Object.entries(oData)) {
        if (field !== 'aParticipant') {
          this[field] = value;
          await redis.client.json.set(_key, `.${field}`, value);
        } else {
          for (const p of value) {
            const participant = p?.toJSON ? p.toJSON() : p;
            const sParticipantId = _.toString(participant?.iUserId);
            if (!sParticipantId) throw new Error(`Invalid participant payload in update(): ${_.stringify(participant)}`);

            // Keep writes sequential to avoid lost updates in JSON compat mode (read-modify-write).
            await redis.client.json.set(_key, `.aParticipant_${sParticipantId}`, participant);
            // Cleanup legacy key shape created by old builds.
            await redis.client.json.del(_key, `.aParticipant-${sParticipantId}`);
          }
        }
      }
    } catch (error) {
      console.log('update::::', error);
      console.log('error stack:::', error.stack);
      throw error;
    }
  }

  async setSchedular(sTaskName = '', iUserId = '', nTimeMS = 0) {
    try {
      if (!sTaskName) return false;
      if (!nTimeMS) return false;

      // log.info('setSchedular:', sTaskName, this.iBattleId, iUserId, nTimeMS);
      return redis.client.pSetEx(_.getSchedulerKey(sTaskName, _.toString(this._id), iUserId), nTimeMS, sTaskName);
    } catch (err) {
      console.log('setSchedular', err);
      log.error('err.message :: ', _.stringify(err.message));
      log.error('err :: ', _.stringify(err));
      log.error(
        `table.setSchedular() failed.${{
          reason: err.message,
          stack: err.stack,
        }}`
      );
      return false;
    }
  }

  async getScheduler(sTask, iUserId = '*') {
    try {
      let schedularKey = '';

      const aSchedular = await redis.client.keys(_.getSchedulerKey(sTask, this._id, iUserId, '*'));
      if (aSchedular.length > 1) redis.client.unlink(aSchedular.slice(1));
      schedularKey = aSchedular[0];

      if (!schedularKey) return null;
      const ttl = await redis.client.pTTL(schedularKey);
      return ttl;
    } catch (error) {
      console.log('getScheduler', error);
    }
  }

  async deleteScheduler(sTaskName = '', iUserId = '*') {
    try {
      const sKey = _.getSchedulerKey(sTaskName, this._id, iUserId);

      const schedularKeys = await redis.client.keys(sKey);
      if (!schedularKeys.length) return false;

      const deletionCount = await redis.client.unlink(schedularKeys);

      log.red(`deleted scheduler ${sTaskName} from ${this._id}`);
      return deletionCount;
    } catch (err) {
      log.error(`table.deleteScheduler(sTaskName: ${sTaskName}, iUserId: ${iUserId}, iBoardId: ${this._id}) failed. reason: ${err.message}`);
      return false;
    }
  }

  async pauseGuestGame(iUserId = '') {
    try {
      if (!this.isGuestTable()) return { bActive: false, aSchedulers: [] };
      if (this.oGuestPause?.bActive) return this.oGuestPause;

      const aSchedulersToPause = [
        { sTaskName: 'assignTurnTimeout', iUserId: this.iUserTurn || '*' },
        { sTaskName: 'initializeGame', iUserId: '' },
        { sTaskName: 'resetTable', iUserId: '' },
        { sTaskName: 'refundOnLongWait', iUserId: '' },
      ];
      const aPausedSchedulers = [];

      for (const scheduler of aSchedulersToPause) {
        const nRemainingMs = await this.getScheduler(scheduler.sTaskName, scheduler.iUserId || '*');
        if (!nRemainingMs || nRemainingMs <= 0) continue;

        await this.deleteScheduler(scheduler.sTaskName, scheduler.iUserId || '*');
        aPausedSchedulers.push({
          sTaskName: scheduler.sTaskName,
          iUserId: scheduler.iUserId || '',
          nRemainingMs,
        });
      }

      this.oGuestPause = {
        bActive: true,
        iPausedByUserId: _.toString(iUserId),
        dPausedAt: Date.now(),
        aSchedulers: aPausedSchedulers,
      };

      await this.update({ oGuestPause: this.oGuestPause });
      return this.oGuestPause;
    } catch (error) {
      console.log('pauseGuestGame', error);
      return { bActive: false, aSchedulers: [] };
    }
  }

  async resumeGuestGame(iUserId = '') {
    try {
      if (!this.isGuestTable()) return { bActive: false, aSchedulers: [] };
      const oPreviousPause = this.oGuestPause || { bActive: false, aSchedulers: [] };
      if (!oPreviousPause.bActive) return this.oGuestPause;

      this.oGuestPause = {
        bActive: false,
        iPausedByUserId: '',
        dPausedAt: 0,
        aSchedulers: [],
      };
      await this.update({ oGuestPause: this.oGuestPause });

      for (const scheduler of oPreviousPause.aSchedulers || []) {
        if (!scheduler?.sTaskName || !scheduler?.nRemainingMs || scheduler.nRemainingMs <= 0) continue;
        await this.setSchedular(scheduler.sTaskName, scheduler.iUserId || '', scheduler.nRemainingMs);
      }

      const participant = iUserId ? this.getParticipant(iUserId) : null;
      if (!participant) return this.oGuestPause;

      const [nRemainingInitializeTime, nRemainingRoundStartsIn, nMaxWaitingTime] = await Promise.all([
        this.getScheduler('initializeGame'),
        this.getScheduler('resetTable'),
        this.getScheduler('refundOnLongWait'),
      ]);

      if (nRemainingInitializeTime > 0) {
        await participant.emit('initializeGame', { nInitializeTimer: nRemainingInitializeTime });
      } else if (nRemainingRoundStartsIn > 0) {
        await participant.emit('initializeGame', { nRoundStartsIn: nRemainingRoundStartsIn });
      } else if (nMaxWaitingTime > 0 && this.eState === 'waiting') {
        await participant.emit('resRefundOnLongWait', {
          message: 'Please wait for other players to join',
          nMaxWaitingTime,
        });
      } else if (typeof participant.sendTurnInfo === 'function') {
        await participant.sendTurnInfo();
      }

      return this.oGuestPause;
    } catch (error) {
      console.log('resumeGuestGame', error);
      return { bActive: false, aSchedulers: [] };
    }
  }

  toJSON() {
    try {
      const table = _.pick(this, [
        '_id',
        'iProtoId',
        'eTableMode',
        'oTutorial',
        'oGuestPause',
        'aCommunityCard',
        'aDeck',
        'oSocketId',
        'eState',
        'iUserTurn',
        // 'iUtgId',
        'iDealerId',
        'iSmallBlindId',
        'iBigBlindId',
        'nMinBuyIn',
        // 'nMaxBuyIn',
        // 'nMaxTableAmount',
        'nMinBet',
        'nMaxBet',
        'nMaxPlayer',
        'nTableChips',
        'sPrivateCode',
        'nTableRound',
        'nGameRound',
        'ePokerType',
        'oSetting',
        'oGameInfo',
      ]);
      table.aParticipant = this.aParticipant.map(p => p.toJSON());
      return table;
    } catch (error) {
      console.log('toJSON', error);
    }
  }

  isGuestTable() {
    return this.eTableMode === 'guest' || this.isTutorialTable();
  }

  isLiveTable() {
    return !this.isGuestTable();
  }

  isTutorialTable() {
    return this.eTableMode === TUTORIAL_TABLE_MODE;
  }

  getTutorialHands() {
    return TUTORIAL_HANDS;
  }

  getTutorialHandConfig() {
    if (!this.isTutorialTable()) return null;
    const nHandIndex = Number(this.oTutorial?.nHandIndex) || 0;
    return TUTORIAL_HANDS[nHandIndex] || TUTORIAL_HANDS[0];
  }

  getTutorialExpectedUserAction() {
    return this.getTutorialHandConfig()?.sExpectedAction || null;
  }

  getTutorialGuestParticipant() {
    return this.aParticipant.find(participant => participant.eUserType === 'guest') || null;
  }

  getTutorialBotParticipants() {
    return this.aParticipant
      .filter(participant => participant.eUserType === 'bot')
      .sort((a, b) => Number(a.nSeat) - Number(b.nSeat));
  }

  assignTutorialRole(participant) {
    if (!this.isTutorialTable() || !participant) return;
    if (participant.eUserType === 'guest') {
      participant.sTutorialRole = 'guest';
      return;
    }
    if (participant.eUserType !== 'bot') return;

    const aBotRoles = this.getTutorialBotParticipants().map(bot => bot.sTutorialRole).filter(Boolean);
    participant.sTutorialRole = !aBotRoles.includes('bot_sb') ? 'bot_sb' : 'bot_bb';
  }

  buildTutorialDeck(oHandConfig) {
    if (!oHandConfig) return this.aDeck;

    const aScriptedIds = new Set(oHandConfig.aDeckTail.map(card => card._id));
    const aFillerDeck = deck
      .getDeck(1)
      .filter(card => !aScriptedIds.has(card._id))
      .slice(0, 24);

    return [...aFillerDeck, ...oHandConfig.aDeckTail];
  }

  prepareTutorialHand() {
    if (!this.isTutorialTable()) return;

    const oGuest = this.getTutorialGuestParticipant();
    const aBots = this.getTutorialBotParticipants();
    const oHandConfig = this.getTutorialHandConfig();
    if (!oGuest || aBots.length < 2 || !oHandConfig) return;

    oGuest.sTutorialRole = 'guest';
    aBots[0].sTutorialRole = 'bot_sb';
    aBots[1].sTutorialRole = 'bot_bb';

    this.iDealerId = aBots[1].iUserId;
    this.aDeck = this.buildTutorialDeck(oHandConfig);
    this.oTutorial = {
      ...(this.oTutorial || {}),
      nHandIndex: Number(this.oTutorial?.nHandIndex) || 0,
      sCurrentHandKey: oHandConfig.sKey,
      sTitle: oHandConfig.sTitle,
      sDescription: oHandConfig.sDescription,
      sExpectedAction: oHandConfig.sExpectedAction,
      bCompleted: false,
    };
  }
}

module.exports = Service;
