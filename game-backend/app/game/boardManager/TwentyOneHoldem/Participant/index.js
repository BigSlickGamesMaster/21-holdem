/* eslint-disable prefer-destructuring */
/* eslint-disable no-continue */
const { Analytics, User } = require('../../../../models');
const Service = require('./lib/Service');

class Participant extends Service {
  async call(oData, callback) {
    try {
      const sTutorialError = this.getTutorialActionError('call', oData);
      if (sTutorialError) return callback({ error: sTutorialError });

      const bCallStand = oData?.bTakeCard === false;
      const bCheckOpenState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
      const nCallAmount = bCheckOpenState ? 0 : Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0);

      if (nCallAmount === 0) return await this.check(oData, callback);

      if (this.nChips < nCallAmount) return await this.allInShortCall({ bStandMode: bCallStand || this.isDoubleDownLock }, callback);

      // Player has acted on their current turn; prevent stale timeout fold on this turn.
      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      await this.updateUser({ $inc: { nChips: -nCallAmount, nTotalBetAmount: nCallAmount } });
      this.nChips -= nCallAmount;
      this.oBoard.nTableChips += nCallAmount;
      this.oBoard.nMaxBet = this.oBoard.nTableChips;
      this.nLastBidChips += nCallAmount;
      this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nCallAmount;
      if (this.nChips <= 0) {
        this.nChips = 0;
        this.isAllInLock = true;
        if (!bCallStand) {
          this.bPendingAllInStandChoice = false;
          this.aUserAction = ['c', 'f'];
        }
      }

      if (nCallAmount > 0) {
        await this.recordTransaction({
          iUserId: this.iUserId,
          iBoardId: this.oBoard._id,
          nAmount: nCallAmount,
          eType: 'debit',
          eMode: 'game',
          eStatus: 'Success',
          nGameRound: this.oBoard.nGameRound,
        });
      }

      if (this.oBoard.nTableRound > 1 && nCallAmount > 0) {
        this.oBoard.aParticipant.forEach(p => {
          if (p.eState !== 'playing') return;
          p.aUserAction = p.aUserAction.map(action => (action === 'ck' ? 'c' : action));
        });
        await this.oBoard.update({ aParticipant: this.oBoard.aParticipant.map(p => p.toJSON()) });
      }

      if (bCallStand) {
        this.isDoubleDownLock = true;
        this.bPendingAllInStandChoice = false;
        this.nStandAtRound = this.oBoard.nTableRound;
        this.aUserAction = ['c', 'f'];
      }

      await this.oBoard.update({ nTableChips: this.oBoard.nTableChips, nMaxBet: this.oBoard.nMaxBet, aParticipant: [this.toJSON()] });
      if (bCallStand) {
        await this.oBoard.emit('resStand', {
          iUserId: this.iUserId,
          nStandAtRound: this.nStandAtRound,
          nTableChips: this.oBoard.nTableChips,
          nLastBidChips: nCallAmount,
          nChips: this.nChips,
          nMinBet: this.oBoard.nMinBet,
          bAllIn: this.isAllInLock || undefined,
        });
        await this.oBoard.saveLogs([{ sAction: 'call+stand', eLogType: 'game', iUserId: this.iUserId, nCallAmount }]);
      } else {
        await this.oBoard.emit('resCall', {
          iUserId: this.iUserId,
          nTableChips: this.oBoard.nTableChips,
          nLastBidChips: nCallAmount,
          nChips: this.nChips,
          nMinBet: this.oBoard.nMinBet,
          bAllIn: this.isAllInLock || undefined,
        });
        await this.oBoard.saveLogs([{ sAction: 'call', eLogType: 'game', iUserId: this.iUserId, nCallAmount }]);
      }

      // if (this.oBoard.nTableChips >= this.oBoard.nMaxTableAmount) return this.reachMaxTableAmount();

      return this.bHasSplit && this.eSplitPhase ? await this.advanceSplitPhase() : await this.passTurn();
    } catch (error) {
      console.log('Error in call method:', error);
    }
  }

  async raise(oData, callback) {
    try {
      const sTutorialError = this.getTutorialActionError('raise', oData);
      if (sTutorialError) return callback({ error: sTutorialError });

      if (this.isDoubleDownLock || this.isAllInLock) return callback({ error: 'Locked players cannot raise while standing/doubledown' });

      const bRaiseStand = oData?.bTakeCard === false;
      const bAllIn = oData?.bAllIn === true;
      const bShortAllInCallMode = this.aUserAction.includes('a') && !this.aUserAction.includes('r');
      if (bShortAllInCallMode) return await this.allInShortCall({ bStandMode: bRaiseStand || this.isDoubleDownLock }, callback);
      if (this.hasActiveAllInOpponent()) return callback({ error: 'Raise is unavailable after a player is all-in' });

      const nRaiseAmount = Number(oData.nRaiseAmount);
      if (!Number.isFinite(nRaiseAmount) || nRaiseAmount <= 0) return callback({ error: 'Raise amount is invalid' });
      if (!bAllIn && nRaiseAmount < this.oBoard.nMinBet) return callback({ error: 'Raise amount is should not be less than min bet' });
      if (!bAllIn && nRaiseAmount > this.oBoard.nMaxBet) return callback({ error: 'Raise amount is should not be greater than max bet' });

      const bCheckOpenState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
      const nToCallAmount = bCheckOpenState ? 0 : Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0);
      const nTotalDebit = nToCallAmount + nRaiseAmount;
      const nNextMinBet = (Number(this.nLastBidChips) || 0) + nTotalDebit;
      if (this.nChips < nTotalDebit) {
        if (this.nChips <= nToCallAmount) {
          return await this.allInShortCall({ bStandMode: bRaiseStand }, callback);
        }

        const nAllInDebit = Math.max(Number(this.nChips) || 0, 0);
        const nActualRaiseAmount = Math.max(nAllInDebit - nToCallAmount, 0);
        const nActualTargetBet = (Number(this.nLastBidChips) || 0) + nAllInDebit;

        await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

        await this.updateUser({ $inc: { nChips: -nAllInDebit, nTotalBetAmount: nAllInDebit } });
        this.nChips = 0;
        this.oBoard.nMinBet = Math.max(Number(this.oBoard.nMinBet) || 0, nActualTargetBet);
        this.oBoard.nTableChips += nAllInDebit;
        this.oBoard.nMaxBet = this.oBoard.nTableChips;
        this.nLastBidChips += nAllInDebit;
        this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nAllInDebit;
        this.isAllInLock = true;
        if (bRaiseStand) {
          this.isDoubleDownLock = true;
          this.bPendingAllInStandChoice = false;
          this.nStandAtRound = this.oBoard.nTableRound;
          this.aUserAction = ['c', 'f'];
        } else {
          this.bPendingAllInStandChoice = false;
          this.aUserAction = ['c', 'f'];
        }

        await this.recordTransaction({
          iUserId: this.iUserId,
          iBoardId: this.oBoard._id,
          nAmount: nAllInDebit,
          eType: 'debit',
          eMode: 'game',
          eStatus: 'Success',
          nGameRound: this.oBoard.nGameRound,
        });

        this.oBoard.aParticipant.forEach(p => {
          if (p.eState !== 'playing') return;
          if (this.oBoard.nTableRound > 1) p.aUserAction = p.aUserAction.map(action => (action === 'ck' ? 'c' : action));
          if (p.iUserId !== this.iUserId) p.nPlayerTurnCount = 0;
        });

        const oRefundAdjustment = await this.refundUncalledExcessAfterShortAllIn();

        await this.oBoard.update({
          nMinBet: this.oBoard.nMinBet,
          nTableChips: this.oBoard.nTableChips,
          nMaxBet: this.oBoard.nMaxBet,
          aParticipant: this.oBoard.aParticipant.map(p => p.toJSON()),
        });

        if (bRaiseStand) {
          await this.oBoard.emit('resStand', {
            iUserId: this.iUserId,
            nStandAtRound: this.nStandAtRound,
            nTableChips: this.oBoard.nTableChips,
            nLastBidChips: nAllInDebit,
            nChips: this.nChips,
            nMinBet: this.oBoard.nMinBet,
            bAllIn: true,
            bShortRaise: true,
            aParticipantAdjustments: oRefundAdjustment?.aParticipantAdjustments || [],
          });
          await this.oBoard.saveLogs([{ sAction: 'allin-raise+stand', eLogType: 'game', iUserId: this.iUserId, nRaiseAmount, nToCallAmount, nAllInDebit, nActualRaiseAmount }]);
        } else {
          await this.oBoard.emit('resRaise', {
            iUserId: this.iUserId,
            nTableChips: this.oBoard.nTableChips,
            nLastBidChips: nAllInDebit,
            nChips: this.nChips,
            nMinBet: this.oBoard.nMinBet,
            bAllIn: true,
            bShortRaise: true,
            aParticipantAdjustments: oRefundAdjustment?.aParticipantAdjustments || [],
          });
          await this.oBoard.saveLogs([{ sAction: 'allin-raise', eLogType: 'game', iUserId: this.iUserId, nRaiseAmount, nToCallAmount, nAllInDebit, nActualRaiseAmount }]);
        }

        return this.bHasSplit && this.eSplitPhase ? await this.advanceSplitPhase() : await this.passTurn();
      }

      // Player has acted on their current turn; prevent stale timeout fold on this turn.
      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      await this.updateUser({ $inc: { nChips: -nTotalDebit, nTotalBetAmount: nTotalDebit } });
      this.nChips -= nTotalDebit;
      this.oBoard.nMinBet = nNextMinBet;
      this.oBoard.nTableChips += nTotalDebit;
      this.oBoard.nMaxBet = this.oBoard.nTableChips;
      this.nLastBidChips += nTotalDebit;
      this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nTotalDebit;
      if (this.nChips <= 0) {
        this.nChips = 0;
        this.isAllInLock = true;
        if (!bRaiseStand) {
          this.bPendingAllInStandChoice = false;
          this.aUserAction = ['c', 'f'];
        }
      }

      await this.recordTransaction({
        iUserId: this.iUserId,
        iBoardId: this.oBoard._id,
        nAmount: nTotalDebit,
        eType: 'debit',
        eMode: 'game',
        eStatus: 'Success',
        nGameRound: this.oBoard.nGameRound,
      });

      this.oBoard.aParticipant.forEach(p => {
        if (p.eState !== 'playing') return;
        if (this.oBoard.nTableRound > 1) p.aUserAction = p.aUserAction.map(action => (action === 'ck' ? 'c' : action));
        if (p.iUserId !== this.iUserId) p.nPlayerTurnCount = 0;
      });

      if (bRaiseStand) {
        this.isDoubleDownLock = true;
        this.bPendingAllInStandChoice = false;
        this.nStandAtRound = this.oBoard.nTableRound;
        this.aUserAction = ['c', 'f'];
      }

      await this.oBoard.update({
        nMinBet: this.oBoard.nMinBet,
        nTableChips: this.oBoard.nTableChips,
        nMaxBet: this.oBoard.nMaxBet,
        aParticipant: this.oBoard.aParticipant.map(p => p.toJSON()),
      });
      if (bRaiseStand) {
        await this.oBoard.emit('resStand', {
          iUserId: this.iUserId,
          nStandAtRound: this.nStandAtRound,
          nTableChips: this.oBoard.nTableChips,
          nLastBidChips: nTotalDebit,
          nChips: this.nChips,
          nMinBet: this.oBoard.nMinBet,
          bAllIn: this.isAllInLock || undefined,
        });
        await this.oBoard.saveLogs([{ sAction: 'raise+stand', eLogType: 'game', iUserId: this.iUserId, nRaiseAmount, nToCallAmount, nTotalDebit }]);
      } else {
        await this.oBoard.emit('resRaise', {
          iUserId: this.iUserId,
          nTableChips: this.oBoard.nTableChips,
          nLastBidChips: nTotalDebit,
          nChips: this.nChips,
          nMinBet: this.oBoard.nMinBet,
          bAllIn: this.isAllInLock || undefined,
        });
        await this.oBoard.saveLogs([{ sAction: 'raise', eLogType: 'game', iUserId: this.iUserId, nRaiseAmount, nToCallAmount, nTotalDebit }]);
      }

      // if (this.oBoard.nTableChips >= this.oBoard.nMaxTableAmount) return this.reachMaxTableAmount();

      return this.bHasSplit && this.eSplitPhase ? await this.advanceSplitPhase() : await this.passTurn();
    } catch (error) {
      console.log('Error in raise method:', error);
    }
  }

  buildParticipantAdjustmentPayload(aParticipants = []) {
    return aParticipants
      .filter(Boolean)
      .map(participant => ({
        iUserId: participant.iUserId,
        nChips: participant.nChips,
        nLastBidChips: participant.nLastBidChips,
      }));
  }

  async refundUncalledExcessAfterShortAllIn() {
    const aActiveParticipants = this.oBoard.aParticipant.filter(participant => participant.eState === 'playing');
    if (aActiveParticipants.length < 2) return null;

    const aNonAllInParticipants = aActiveParticipants.filter(participant => !participant.isAllInLock);
    if (aNonAllInParticipants.length > 1) return null;

    const aContributionSummary = aActiveParticipants
      .map(participant => ({
        participant,
        nContribution: Math.max(Number(participant.nLastBidChips) || 0, 0),
      }))
      .filter(({ nContribution }) => nContribution > 0)
      .sort((firstItem, secondItem) => secondItem.nContribution - firstItem.nContribution);

    if (aContributionSummary.length < 2) return null;

    const oHighestContribution = aContributionSummary[0];
    const nSecondHighestContribution = aContributionSummary[1].nContribution;
    const aHighestContributors = aContributionSummary.filter(({ nContribution }) => nContribution === oHighestContribution.nContribution);
    if (aHighestContributors.length !== 1) return null;

    const nRefundAmount = oHighestContribution.nContribution - nSecondHighestContribution;
    if (!(nRefundAmount > 0)) return null;

    const oRefundParticipant = oHighestContribution.participant;
    oRefundParticipant.nLastBidChips = Math.max((Number(oRefundParticipant.nLastBidChips) || 0) - nRefundAmount, 0);
    oRefundParticipant.nTotalBidChips = Math.max((Number(oRefundParticipant.nTotalBidChips) || 0) - nRefundAmount, 0);
    oRefundParticipant.nChips = (Number(oRefundParticipant.nChips) || 0) + nRefundAmount;

    this.oBoard.nTableChips = Math.max((Number(this.oBoard.nTableChips) || 0) - nRefundAmount, 0);
    this.oBoard.nMaxBet = this.oBoard.nTableChips;
    this.oBoard.nMinBet = aActiveParticipants.reduce(
      (nHighestContribution, participant) => Math.max(nHighestContribution, Math.max(Number(participant.nLastBidChips) || 0, 0)),
      0
    );

    await oRefundParticipant.updateUser({ $inc: { nChips: nRefundAmount, nTotalBetAmount: -nRefundAmount } });
    await oRefundParticipant.recordTransaction({
      iUserId: oRefundParticipant.iUserId,
      iBoardId: this.oBoard._id,
      nAmount: nRefundAmount,
      eType: 'credit',
      eMode: 'game',
      eStatus: 'Success',
      sDescription: 'Uncalled bet refund',
      nGameRound: this.oBoard.nGameRound,
    });
    await this.oBoard.saveLogs([
      {
        sAction: 'uncalled-bet-refund',
        eLogType: 'game',
        iUserId: oRefundParticipant.iUserId,
        nRefundAmount,
        nAdjustedMinBet: this.oBoard.nMinBet,
      },
    ]);

    return {
      iUserId: oRefundParticipant.iUserId,
      nRefundAmount,
      nAdjustedMinBet: this.oBoard.nMinBet,
      aParticipantAdjustments: this.buildParticipantAdjustmentPayload([oRefundParticipant]),
    };
  }

  async allInShortCall(oOptions = {}, callback) {
    try {
      if (typeof oOptions === 'function') {
        callback = oOptions;
        oOptions = {};
      }

      const fnCallback = typeof callback === 'function' ? callback : () => {};
      const bStandMode = Boolean(oOptions?.bStandMode);
      const bCheckOpenState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
      const nToCallAmount = bCheckOpenState ? 0 : Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0);
      const nAllInAmount = Math.max(Number(this.nChips) || 0, 0);

      if (nToCallAmount <= 0) return fnCallback({ error: 'All-in call is not available in open/check state' });
      if (nAllInAmount <= 0) return fnCallback({ error: 'No chips available for all-in' });
      if (nAllInAmount >= nToCallAmount) return fnCallback({ error: 'All-in short-call path is only valid when chips are below call amount' });

      // Player has acted on their current turn; prevent stale timeout fold on this turn.
      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      await this.updateUser({ $inc: { nChips: -nAllInAmount, nTotalBetAmount: nAllInAmount } });
      this.nChips = 0;
      this.oBoard.nTableChips += nAllInAmount;
      this.oBoard.nMaxBet = this.oBoard.nTableChips;
      this.nLastBidChips += nAllInAmount;
      this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nAllInAmount;
      this.isAllInLock = true;
      if (bStandMode) {
        this.isDoubleDownLock = true;
        this.bPendingAllInStandChoice = false;
        this.nStandAtRound = this.oBoard.nTableRound;
      } else {
        this.bPendingAllInStandChoice = false;
      }
      this.aUserAction = ['c', 'f'];

      await this.recordTransaction({
        iUserId: this.iUserId,
        iBoardId: this.oBoard._id,
        nAmount: nAllInAmount,
        eType: 'debit',
        eMode: 'game',
        eStatus: 'Success',
        nGameRound: this.oBoard.nGameRound,
      });

      const oRefundAdjustment = await this.refundUncalledExcessAfterShortAllIn();

      await this.oBoard.update({
        nMinBet: this.oBoard.nMinBet,
        nTableChips: this.oBoard.nTableChips,
        nMaxBet: this.oBoard.nMaxBet,
        aParticipant: oRefundAdjustment ? this.oBoard.aParticipant.map(participant => participant.toJSON()) : [this.toJSON()],
      });

      await this.oBoard.emit('resCall', {
        iUserId: this.iUserId,
        nTableChips: this.oBoard.nTableChips,
        nLastBidChips: nAllInAmount,
        nChips: this.nChips,
        nMinBet: this.oBoard.nMinBet,
        bAllIn: true,
        bShortCall: true,
        bStandMode,
        nShortAmount: Math.max(nToCallAmount - nAllInAmount, 0),
        aParticipantAdjustments: oRefundAdjustment?.aParticipantAdjustments || [],
      });
      await this.oBoard.saveLogs([
        {
          sAction: 'allin-short-call',
          eLogType: 'game',
          iUserId: this.iUserId,
          nToCallAmount,
          nAllInAmount,
          nShortAmount: Math.max(nToCallAmount - nAllInAmount, 0),
        },
      ]);

      return this.bHasSplit && this.eSplitPhase ? await this.advanceSplitPhase() : await this.passTurn();
    } catch (error) {
      console.log('Error in allInShortCall method:', error);
    }
  }

  async doubleDown(oData, callback) {
    try {
      const sTutorialError = this.getTutorialActionError('doubleDown', oData);
      if (sTutorialError) return callback({ error: sTutorialError });

      if (this.bHasSplit) return callback({ error: 'Double down is not allowed on a split hand' });

      if (this.oBoard.nTableRound !== 2) return callback({ error: 'Double down is only available in round 2' });
      const nDoubleDownAmount = this.oBoard.nMinBet * 2;
      if (this.nChips < nDoubleDownAmount) {
        return callback({ error: "Oh no! You don't have enough chips to play here, Would you like to visit the store to top up your bankroll?" });
      }
      if (nDoubleDownAmount < this.oBoard.nMinBet) return callback({ error: 'Double down amount is should not be less than min bet' });

      // Player has acted on their current turn; prevent stale timeout fold on this turn.
      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      this.isDoubleDownLock = true;
      this.aUserAction = ['c', 'f'];

      await this.updateUser({ $inc: { nChips: -nDoubleDownAmount, nTotalBetAmount: nDoubleDownAmount } });
      this.nChips -= nDoubleDownAmount;
      this.oBoard.nTableChips += nDoubleDownAmount;
      this.oBoard.nMaxBet = this.oBoard.nTableChips;
      this.nLastBidChips = nDoubleDownAmount;
      this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nDoubleDownAmount;

      await this.recordTransaction({
        iUserId: this.iUserId,
        iBoardId: this.oBoard._id,
        nAmount: nDoubleDownAmount,
        eType: 'debit',
        eMode: 'game',
        eStatus: 'Success',
        nGameRound: this.oBoard.nGameRound,
      });

      const oCard = this.oBoard.aDeck.pop();
      this.aCardHand.push(oCard);
      this.nCardScore = (Number(this.nCardScore) || 0) + (Number(oCard?.nValue) || 0);

      if (this.nCardScore > 21) {
        const oAceCardHand = this.aCardHand.find(card => card.nValue === 11);
        if (oAceCardHand) {
          oAceCardHand.nValue = 1;
          this.bHasAceAndBust = true;
          this.nCardScore -= 10;
        } else {
          this.eState = 'bust';
          await this.foldPlayer({ sReason: 'Player is bust due to score above 21', eBehaviour: 'bust' });
        }
      }

      await this.oBoard.update({
        aDeck: this.oBoard.aDeck,
        aParticipant: [this.toJSON()],
        nTableChips: this.oBoard.nTableChips,
        nMaxBet: this.oBoard.nMaxBet,
      });
      await this.oBoard.emit('resDoubledown', {
        iUserId: this.iUserId,
        oCard,
        // aCardHand: this.aCardHand,
        nCardScore: this.nCardScore,
        nLastBidChips: this.nLastBidChips,
        bHasAceAndBust: this.bHasAceAndBust,
        nTableChips: this.oBoard.nTableChips,
        nChips: this.nChips,
      });
      await this.oBoard.saveLogs([{ sAction: 'doubledown', eLogType: 'game', iUserId: this.iUserId, nDoubleDownAmount }]);

      if (this.nCardScore === 21) {
        await _.delay(500);
        return await this.oBoard.declareResult([this], 'doubleDown: 21 player wins');
      }

      // if (this.oBoard.nTableChips >= this.oBoard.nMaxTableAmount) return this.reachMaxTableAmount();

      return this.passTurn();
    } catch (error) {
      console.log('Error in doubledown method:', error);
    }
  }

  async stand(oData, callback) {
    try {
      const sTutorialError = this.getTutorialActionError('stand', oData);
      if (sTutorialError) return callback({ error: sTutorialError });

      const bCheckOpenState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
      const bResolvingAllInStandChoice = this.isAllInLock && this.bPendingAllInStandChoice;
      const nStandAmount = bResolvingAllInStandChoice ? 0 : (bCheckOpenState ? 0 : Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0));
      const bIsDefendingRaise = nStandAmount > 0;
      if (this.nChips < nStandAmount) return await this.allInShortCall({ bStandMode: true }, callback);

      // Player has acted on their current turn; prevent stale timeout fold on this turn.
      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      this.isDoubleDownLock = true; // lock double down because player is stand & its same functionality
      this.bPendingAllInStandChoice = false;
      this.nStandAtRound = this.oBoard.nTableRound;
      this.aUserAction = bCheckOpenState ? ['ck', 'f'] : ['c', 'f'];

      if (nStandAmount > 0) {
        await this.updateUser({ $inc: { nChips: -nStandAmount, nTotalBetAmount: nStandAmount } });
        this.nChips -= nStandAmount;
        this.oBoard.nTableChips += nStandAmount;
        this.oBoard.nMaxBet = this.oBoard.nTableChips;
        this.nLastBidChips += nStandAmount;
        this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nStandAmount;

        await this.recordTransaction({
          iUserId: this.iUserId,
          iBoardId: this.oBoard._id,
          nAmount: nStandAmount,
          eType: 'debit',
          eMode: 'game',
          eStatus: 'Success',
          nGameRound: this.oBoard.nGameRound,
        });
      }

      await this.oBoard.update({
        ...(nStandAmount > 0 && { nTableChips: this.oBoard.nTableChips, nMaxBet: this.oBoard.nMaxBet }),
        aParticipant: [this.toJSON()],
      });

      if (this.oBoard.nTableRound > 1 && bIsDefendingRaise) {
        this.oBoard.aParticipant.forEach(p => {
          if (p.eState !== 'playing') return;
          p.aUserAction = p.aUserAction.map(action => (action === 'ck' ? 'c' : action));
        });
        await this.oBoard.update({ aParticipant: this.oBoard.aParticipant.map(p => p.toJSON()) });
      }

      await this.oBoard.emit('resStand', {
        iUserId: this.iUserId,
        nStandAtRound: this.nStandAtRound,
        nTableChips: this.oBoard.nTableChips,
        nLastBidChips: nStandAmount,
        nChips: this.nChips,
        nMinBet: this.oBoard.nMinBet,
        bAllIn: bResolvingAllInStandChoice || undefined,
      });
      await this.oBoard.saveLogs([{ sAction: 'stand', eLogType: 'game', iUserId: this.iUserId, nStandAmount, bIsDefendingRaise }]);

      // if (this.oBoard.nTableChips >= this.oBoard.nMaxTableAmount) return this.reachMaxTableAmount();

      return this.bHasSplit && this.eSplitPhase ? await this.advanceSplitPhase() : await this.passTurn();
    } catch (error) {
      console.log('Error in stand method:', error);
    }
  }

  async turnMissed() {
    try {
      if (this.oBoard.eState !== 'playing' || this.eState !== 'playing') return false;

      if (this.isAllInLock && this.bPendingAllInStandChoice) {
        await this.oBoard.saveLogs([{ sAction: 'allInStandChoiceTimeoutConfirm', eLogType: 'game', iUserId: this.iUserId }]);
        return await this.check({}, () => {});
      }

      const { nMaxTurnMissAllowed } = this.oBoard.oSetting;

      this.nTurnMissed += 1;
      await this.oBoard.update({ aParticipant: [this.toJSON()] });
      await this.oBoard.emit('resTurnMissed', { nTurnMissed: this.nTurnMissed, iUserId: this.iUserId, nMaxTurnMissAllowed });

      await this.oBoard.saveLogs([{ sAction: 'turnMissed', eLogType: 'game', iUserId: this.iUserId, nTurnMissed: this.nTurnMissed }]);
      if (this.nTurnMissed == nMaxTurnMissAllowed) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await Promise.all([
          this.dGameStartedAt !== 0 &&
            Analytics.findOneAndUpdate(
              { iUserId: this.iUserId, dCreatedDate: { $gte: today } },
              { $inc: { nInGameTime: Math.floor((Date.now() - this.dGameStartedAt) / 1000) } },
              { upsert: true, setDefaultsOnInsert: true }
            ),
          User.updateOne({ _id: this.iUserId }, { $pull: { aPokerBoard: this.oBoard._id } }),
        ]);
        return await this.foldPlayer({ sReason: 'You have been kicked out due to inactivity!', eBehaviour: 'leave', bShowMessage: true });
      }
      return await this.foldPlayer({ sReason: 'You have been folded due to first missed turn!', eBehaviour: 'fold' });
      // return await this.passTurn();
    } catch (error) {
      console.log('turnMissed', error);
    }
  }

  async check(oData, callback) {
    try {
      const sTutorialError = this.getTutorialActionError('check', oData);
      if (sTutorialError) return callback({ error: sTutorialError });

      // Player has acted on their current turn; prevent stale timeout fold on this turn.
      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      if (this.isAllInLock && this.bPendingAllInStandChoice) {
        this.bPendingAllInStandChoice = false;
        this.aUserAction = ['c', 'f'];
        await this.oBoard.update({ aParticipant: [this.toJSON()] });
      }

      if (this.bHasSplit && this.eSplitPhase) {
        await this.advanceSplitPhase();
      } else {
        await this.passTurn();
      }
      return await this.oBoard.saveLogs([{ sAction: 'check', eLogType: 'game', iUserId: this.iUserId }]);
    } catch (error) {
      console.log('Error in check method:', error);
    }
  }

  async takeTurn() {
    try {
      if (this.oBoard.eState !== 'playing') return false;

      const playingPlayers = this.oBoard.aParticipant.filter(e => e.eState === 'playing');
      if (this.eState !== 'playing') {
        if (playingPlayers.length === 1) return await this.oBoard.declareResult(playingPlayers, 'takeTurn: non-playing target with 1 player left');
        const nextParticipant = this.oBoard.getNextParticipant(this.nSeat);
        if (nextParticipant && nextParticipant.iUserId !== this.iUserId) return await nextParticipant.takeTurn();
        return false;
      }

      if (playingPlayers.length === 1) return await this.oBoard.declareResult(playingPlayers, 'takeTurn: 1 player left');

      if (this.isAllInLock && this.bPendingAllInStandChoice && !this.isLiveBettingSettled()) {
        await this.oBoard.saveLogs([{ sAction: 'deferAllInStandChoiceUntilBettingSettled', eLogType: 'game', iUserId: this.iUserId }]);
        return await this.passTurn();
      }

      if (this.isAllInLock && this.bPendingAllInStandChoice) {
        this.oBoard.iUserTurn = this.iUserId;
        const { nTurnTime } = this.oBoard.oSetting;
        const bTutorialTurn = this.oBoard?.isTutorialTable?.() === true;

        this.nPlayerTurnCount += 1;
        this.aUserAction = ['c', 's'];

        const turnScheduler = await this.oBoard.getScheduler('assignTurnTimeout');
        if (turnScheduler) await this.oBoard.deleteScheduler('assignTurnTimeout');
        if (!bTutorialTurn) await this.oBoard.setSchedular('assignTurnTimeout', this.iUserId, nTurnTime);

        await this.oBoard.update({ iUserTurn: this.iUserId, aParticipant: [this.toJSON()] });
        await this.oBoard.emit('resPlayerTurn', {
          iUserId: this.iUserId,
          ttl: bTutorialTurn ? null : nTurnTime,
          nTotalTurnTime: bTutorialTurn ? null : nTurnTime,
          aUserAction: this.aUserAction,
          nMinBet: this.oBoard.nMinBet,
          toCallAmount: 0,
          eSplitPhase: this.eSplitPhase ?? null,
          bAllInStandChoice: true,
        });
        await this.oBoard.saveLogs([{ sAction: 'assignAllInStandChoice', eLogType: 'game', iUserId: this.oBoard.iUserTurn }]);
        if (this.isAutomatedPlayer()) await this.playAutomatedAllInStandChoice();
        return true;
      }

      if (this.isAllInLock) {
        this.nPlayerTurnCount += 1;
        await this.oBoard.update({ aParticipant: [this.toJSON()] });
        return await this.passTurn();
      }

      if (this.isDoubleDownLock) {
        const bRoundOpenCheckState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
        const nLockedToCallAmount = Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0);
        const bNeedsDefendRaise = !bRoundOpenCheckState && nLockedToCallAmount > 0;

        if (!bNeedsDefendRaise) {
          this.aUserAction = ['ck', 'f'];
          this.nPlayerTurnCount += 1;
          await this.oBoard.update({ aParticipant: [this.toJSON()] });
          return await this.passTurn();
        }
        this.aUserAction = ['c', 'f'];
      }

      this.oBoard.iUserTurn = this.iUserId;
      const { nTurnTime, nTurnBuffer } = this.oBoard.oSetting;
      const bTutorialTurn = this.oBoard?.isTutorialTable?.() === true;

      this.nPlayerTurnCount += 1;

      const turnScheduler = await this.oBoard.getScheduler('assignTurnTimeout');
      if (turnScheduler) await this.oBoard.deleteScheduler('assignTurnTimeout');
      if (!bTutorialTurn) await this.oBoard.setSchedular('assignTurnTimeout', this.iUserId, nTurnTime);

      const bCheckOpenState = this.aUserAction.includes('ck') && !this.aUserAction.includes('c');
      const nToCallAmount = bCheckOpenState ? 0 : Math.max(this.oBoard.nMinBet - this.nLastBidChips, 0);
      if (nToCallAmount === 0) this.aUserAction = this.aUserAction.map(action => (action === 'c' ? 'ck' : action));
      else this.aUserAction = this.aUserAction.map(action => (action === 'ck' ? 'c' : action));
      if (this.hasActiveAllInOpponent()) this.aUserAction = this.aUserAction.filter(action => action !== 'r');

      if (this.nChips < nToCallAmount) this.aUserAction = ['f', 'a'];
      // Safety net: chips exactly 0 after a raise/call — ensure all-in lock is honoured
      if (this.nChips === 0 && nToCallAmount > 0) {
        this.isAllInLock = true;
        this.bPendingAllInStandChoice = false;
        this.aUserAction = ['c', 'f'];
        await this.oBoard.update({ aParticipant: [this.toJSON()] });
        return await this.passTurn();
      }
      await this.oBoard.update({ iUserTurn: this.iUserId, aParticipant: [this.toJSON()] });

      this.oBoard.emit('resPlayerTurn', {
        iUserId: this.iUserId,
        ttl: bTutorialTurn ? null : nTurnTime,
        nTotalTurnTime: bTutorialTurn ? null : nTurnTime,
        aUserAction: this.getAvailableTurnActions(),
        nMinBet: this.oBoard.nMinBet,
        toCallAmount: nToCallAmount,
        eSplitPhase: this.eSplitPhase ?? null,
      });
      this.oBoard.saveLogs([{ sAction: 'assignTurn', eLogType: 'game', iUserId: this.oBoard.iUserTurn }]);
      if (this.isAutomatedPlayer()) {
        if (this.oBoard?.isTutorialTable?.()) await this.playTutorialTurn({ toCallAmount: nToCallAmount });
        else await this.playAutomatedTurn({ toCallAmount: nToCallAmount });
      }
    } catch (error) {
      console.log('takeTurn', error);
    }
  }

  async playAutomatedAllInStandChoice() {
    const noop = () => {};
    const nDecisionDelay = _.randomBetween(650, 950);

    await _.delay(nDecisionDelay);
    await this.waitForGuestResume();

    if (this.oBoard.eState !== 'playing' || this.eState !== 'playing') return false;
    if (!this.hasValidTurn() || !this.isAllInLock || !this.bPendingAllInStandChoice) return false;

    const score = Number(this.nCardScore) || 0;
    const oBotProfile = this.getBotStyleProfile();
    if (this.aUserAction.includes('s') && score >= oBotProfile.nFallbackStandScore) return await this.stand({}, noop);
    return await this.check({}, noop);
  }

  getAutomatedRaiseAmount(toCallAmount = 0) {
    const minRaiseAmount = Math.max(Number(this.oBoard.nMinBet) || 0, 1);
    const maxRaiseAmount = Math.max(Number(this.oBoard.nMaxBet) || 0, minRaiseAmount);
    const affordableRaise = Math.max(0, Math.floor((Number(this.nChips) || 0) - Math.max(Number(toCallAmount) || 0, 0)));
    if (affordableRaise < minRaiseAmount) return null;
    return Math.min(minRaiseAmount, maxRaiseAmount, affordableRaise);
  }

  async waitForGuestResume() {
    while (this.oBoard?.oGuestPause?.bActive) {
      await _.delay(160);
    }
  }

  async playAutomatedTurn({ toCallAmount = 0 } = {}) {
    const noop = () => {};
    const nDecisionDelay = _.randomBetween(1450, 1900);

    await _.delay(nDecisionDelay);
    await this.waitForGuestResume();

    if (this.oBoard.eState !== 'playing' || this.eState !== 'playing') return false;
    if (!this.hasValidTurn()) return false;
    if (Math.random() <= 0.03) return false;

    const allowedActions = new Set(this.aUserAction);
    const score = Number(this.nCardScore) || 0;
    const callAmount = Math.max(Number(toCallAmount) || 0, 0);
    const stack = Math.max(Number(this.nChips) || 0, 0);
    const pressureRatio = callAmount > 0 ? callAmount / Math.max(stack, 1) : 0;
    const raiseAmount = this.getAutomatedRaiseAmount(callAmount);
    const oBotProfile = this.getBotStyleProfile();
    const nDecisionRoll = Math.random();

    if (allowedActions.has('a') && pressureRatio >= oBotProfile.nAllInPressure) return await this.allInShortCall(noop);
    if (
      allowedActions.has('d') &&
      callAmount === 0 &&
      score >= oBotProfile.nDoubleDownMinScore &&
      score <= oBotProfile.nDoubleDownMaxScore &&
      stack >= this.oBoard.nMinBet * 2
    ) {
      return await this.doubleDown({}, noop);
    }
    if (allowedActions.has('s') && score >= oBotProfile.nStandScore) return await this.stand({}, noop);
    if (allowedActions.has('ck') && score >= oBotProfile.nCheckScore) return await this.check({}, noop);
    if (
      allowedActions.has('r') &&
      raiseAmount &&
      callAmount === 0 &&
      score >= oBotProfile.nOpenRaiseMinScore &&
      score <= oBotProfile.nOpenRaiseMaxScore &&
      nDecisionRoll <= oBotProfile.nOpenRaiseChance
    ) {
      return await this.raise({ nRaiseAmount: raiseAmount }, noop);
    }
    if (
      allowedActions.has('r') &&
      raiseAmount &&
      callAmount > 0 &&
      score >= oBotProfile.nCounterRaiseMinScore &&
      pressureRatio <= oBotProfile.nCounterPressureTolerance &&
      nDecisionRoll <= oBotProfile.nCounterRaiseChance
    ) {
      return await this.raise({ nRaiseAmount: raiseAmount }, noop);
    }
    if (
      allowedActions.has('c') &&
      score <= oBotProfile.nLooseCallScore &&
      (score <= oBotProfile.nFallbackStandScore || pressureRatio <= oBotProfile.nPressureTolerance || nDecisionRoll <= oBotProfile.nLooseCallChance)
    ) {
      return await this.call({}, noop);
    }
    if (allowedActions.has('ck')) return await this.check({}, noop);
    if (allowedActions.has('s') && score >= oBotProfile.nFallbackStandScore) return await this.stand({}, noop);
    if (allowedActions.has('c') && pressureRatio <= oBotProfile.nPressureTolerance * 0.75) return await this.call({}, noop);
    if (allowedActions.has('f')) return await this.foldPlayer({ sReason: 'Bot fold', eBehaviour: 'fold' });
    return false;
  }

  async playTutorialTurn({ toCallAmount = 0 } = {}) {
    const noop = () => {};
    await _.delay(_.randomBetween(1400, 1800));
    await this.waitForGuestResume();

    if (!this.oBoard?.isTutorialTable?.() || this.eState !== 'playing' || !this.hasValidTurn()) return false;

    const oHandConfig = this.oBoard.getTutorialHandConfig?.();
    const sAction = oHandConfig?.oBotActions?.[this.sTutorialRole];
    if (!sAction) return false;

    switch (sAction) {
      case 'fold':
        return await this.foldPlayer({ sReason: 'Tutorial bot fold', eBehaviour: 'fold' });
      case 'check':
        return await this.check({}, noop);
      case 'call':
        return await this.call({}, noop);
      case 'stand':
        return await this.stand({}, noop);
      case 'doubleDown':
        return await this.doubleDown({}, noop);
      default:
        return false;
    }
  }

  async advanceSplitPhase() {
    if (!this.bHasSplit || !this.eSplitPhase) return await this.passTurn();

    if (this.eSplitPhase === 'hand1') {
      this.nSplitHand1RoundCount += 1;
      // All-in on hand1 — auto-fold hand2
      if (this.nChips === 0) {
        this.bSplitHand2Locked = true;
        this.eSplitPhase = null;
        await this.oBoard.update({ aParticipant: [this.toJSON()] });
        await this.oBoard.emit('resSplitAutoFold', {
          iUserId: this.iUserId,
          sReason: 'allin',
          sMessage: 'Your second hand was folded — you went all-in on hand 1',
        });
        return await this.passTurn();
      }
      // Advance to hand2 if it is not already locked
      if (!this.bSplitHand2Locked) {
        this.eSplitPhase = 'hand2';
        await this.oBoard.update({ aParticipant: [this.toJSON()] });
        return await this.takeTurn();
      }
      // hand2 already locked — done
      this.eSplitPhase = null;
      await this.oBoard.update({ aParticipant: [this.toJSON()] });
      return await this.passTurn();
    }

    if (this.eSplitPhase === 'hand2') {
      this.nSplitHand2RoundCount += 1;
      this.eSplitPhase = null;
      await this.oBoard.update({ aParticipant: [this.toJSON()] });
      return await this.passTurn();
    }

    return await this.passTurn();
  }

  isParticipantSettledForLiveBetting(participant) {
    if (!participant || participant.eState !== 'playing') return true;
    if (participant.isAllInLock) return true;
    if (participant.bHasSplit) {
      const hand1Settled = participant.bSplitHand1Locked || participant.nSplitHand1RoundCount > 0;
      const hand2Settled = participant.bSplitHand2Locked || participant.nSplitHand2RoundCount > 0;
      return hand1Settled && hand2Settled;
    }

    const bCheckOpenState = participant.aUserAction.includes('ck') && !participant.aUserAction.includes('c');
    const nRequiredContribution = bCheckOpenState ? 0 : this.oBoard.nMinBet;
    return participant.nPlayerTurnCount > 0 && participant.nLastBidChips >= nRequiredContribution;
  }

  isLiveBettingSettled() {
    const aActiveParticipants = this.oBoard.aParticipant.filter(p => p.eState === 'playing');
    return aActiveParticipants.every(participant => this.isParticipantSettledForLiveBetting(participant));
  }

  async passTurn() {
    try {
      if (this.oBoard.eState !== 'playing') return false;

      // when all players are card lock, declare result with all players who have the highest score
      let bIsAllPlayerCardLock = true;
      for (const participant of this.oBoard.aParticipant) {
        if (participant.eState !== 'playing') continue;

        if (!participant.isDoubleDownLock) {
          bIsAllPlayerCardLock = false;
          break;
        }
      }
      if (bIsAllPlayerCardLock) {
        const bHasPendingLockedDefend = this.oBoard.aParticipant.some(participant => {
          if (participant.eState !== 'playing' || !participant.isDoubleDownLock) return false;
          const bOpenCheckState = participant.aUserAction.includes('ck') && !participant.aUserAction.includes('c');
          if (bOpenCheckState) return false;
          return participant.nLastBidChips < this.oBoard.nMinBet;
        });

        if (!bHasPendingLockedDefend) {
          let maxScore = 0;
          let winner = [];

          for (const participant of this.oBoard.aParticipant) {
            const nParticipantScore = Number(participant.nCardScore) || 0;
            if (participant.eState === 'playing' && nParticipantScore <= 21) {
              if (nParticipantScore > maxScore) {
                maxScore = nParticipantScore;
                winner = [participant];
              } else if (nParticipantScore === maxScore) {
                winner.push(participant);
              }
            }
          }

          return await this.oBoard.declareResult(winner, 'passTurn: allPlayerCardLock winner');
        }
      }

      const aActiveParticipants = this.oBoard.aParticipant.filter(p => p.eState === 'playing');
      if (aActiveParticipants.length === 1) return await this.oBoard.declareResult(aActiveParticipants, 'passTurn: 1 player left');

      const bLiveBettingSettled = this.isLiveBettingSettled();
      const bAllAllInChoicesSettled = aActiveParticipants.every(p => !p.isAllInLock || !p.bPendingAllInStandChoice);
      const bRoundSettled = bLiveBettingSettled && bAllAllInChoicesSettled;
      if (bRoundSettled) return this.oBoard.dealCommunityCard();

      const nextParticipant = this.oBoard.getNextParticipant(this.nSeat);
      if (!nextParticipant) return log.red('No next participant found:: passTurn');

      // current player turn count is same as next participant turn count, then dealer is next participant
      this.oBoard.iUserTurn = nextParticipant.iUserId;
      await this.oBoard.update({ iUserTurn: this.oBoard.iUserTurn });

      return emitter.emit('takeTurn', { iBoardId: this.oBoard._id, iUserId: nextParticipant.iUserId });
    } catch (error) {
      console.log('passTurn', error);
    }
  }

  // async reachMaxTableAmount() {
  //   try {
  //     let maxScore = 0;
  //     let aWinner = [];

  //     for (const participant of this.oBoard.aParticipant) {
  //       if (participant.eState == 'playing' && participant.nCardScore <= 21) {
  //         if (participant.nCardScore > maxScore) {
  //           maxScore = participant.nCardScore;
  //           aWinner = [participant];
  //         } else if (participant.nCardScore === maxScore) {
  //           aWinner.push(participant);
  //         }
  //       }
  //     }

  //     await this.oBoard.saveLogs([{ sAction: 'reachMaxTableAmount', eLogType: 'game', iUserId: this.iUserId, aWinner }]);
  //     return await this.oBoard.declareResult(aWinner, 'reachMaxTableAmount: aWinner');
  //   } catch (error) {
  //     console.log('reachMaxTableAmount', error);
  //   }
  // }

  async split(oData, callback) {
    try {
      if (this.bHasSplit) return callback({ error: 'You have already split this hand' });

      const communityCards = this.oBoard.aCommunityCard;
      if (!communityCards || communityCards.length !== 1) {
        return callback({ error: 'Split is only available when exactly one community card has been dealt' });
      }

      const holeCard = this.aCardHand[0];
      const communityCard = communityCards[0];
      if (!holeCard || !communityCard || holeCard.nLabel !== communityCard.nLabel) {
        return callback({ error: 'Split requires your hole card to match the community card' });
      }

      const nSplitAmount = this.nLastBidChips; // match the wager already placed for this round
      if (this.nChips < nSplitAmount) {
        return callback({ error: "Not enough chips to split" });
      }

      await this.oBoard.deleteScheduler('assignTurnTimeout', this.iUserId);

      await this.updateUser({ $inc: { nChips: -nSplitAmount, nTotalBetAmount: nSplitAmount } });
      this.nChips -= nSplitAmount;
      this.oBoard.nTableChips += nSplitAmount;
      this.oBoard.nMaxBet = this.oBoard.nTableChips;
      this.nLastBidChips = (this.nLastBidChips ?? 0) + nSplitAmount;
      this.nTotalBidChips = (this.nTotalBidChips ?? 0) + nSplitAmount;

      await this.recordTransaction({
        iUserId: this.iUserId,
        iBoardId: this.oBoard._id,
        nAmount: nSplitAmount,
        eType: 'debit',
        eMode: 'game',
        eStatus: 'Success',
        nGameRound: this.oBoard.nGameRound,
      });

      // Deal 2 new private cards — one per split hand
      const oMainCard = this.oBoard.aDeck.pop();
      const oSplitCard = this.oBoard.aDeck.pop();

      // Main hand: original hole card + new main card
      this.aCardHand = [holeCard, oMainCard];
      this.nCardScore = (Number(holeCard.nValue) || 0) + (Number(oMainCard.nValue) || 0);
      if (this.nCardScore > 21) {
        const aceInMain = this.aCardHand.find(c => c.nValue === 11);
        if (aceInMain) { aceInMain.nValue = 1; this.nCardScore -= 10; }
      }

      // Split hand: copy of the community card + new split card
      const oCommunityCardCopy = { ...communityCard };
      this.aSplitHand = [oCommunityCardCopy, oSplitCard];
      this.nSplitCardScore = (Number(oCommunityCardCopy.nValue) || 0) + (Number(oSplitCard.nValue) || 0);
      if (this.nSplitCardScore > 21) {
        const aceInSplit = this.aSplitHand.find(c => c.nValue === 11);
        if (aceInSplit) { aceInSplit.nValue = 1; this.nSplitCardScore -= 10; }
      }

      this.bHasSplit = true;
      this.eSplitPhase = 'hand1';
      this.bSplitHand1Locked = false;
      this.bSplitHand2Locked = false;
      this.nSplitHand1RoundCount = 0;
      this.nSplitHand2RoundCount = 0;

      await this.oBoard.update({
        aDeck: this.oBoard.aDeck,
        aParticipant: [this.toJSON()],
        nTableChips: this.oBoard.nTableChips,
        nMaxBet: this.oBoard.nMaxBet,
      });

      await this.oBoard.emit('resSplit', {
        iUserId: this.iUserId,
        oMainCard,
        oSplitCard,
        oCommunityCard: oCommunityCardCopy,
        aCardHand: this.aCardHand,
        nCardScore: this.nCardScore,
        aSplitHand: this.aSplitHand,
        nSplitCardScore: this.nSplitCardScore,
        bHasSplit: true,
        nTableChips: this.oBoard.nTableChips,
        nChips: this.nChips,
        nLastBidChips: this.nLastBidChips,
      });

      await this.oBoard.saveLogs([{ sAction: 'split', eLogType: 'game', iUserId: this.iUserId, nSplitAmount }]);
      return await this.takeTurn();
    } catch (error) {
      console.log('Error in split method:', error);
    }
  }
}

module.exports = Participant;
