const Service = require('./lib/Service');
const { redis, deck, mongodb } = require('../../../../utils');
const { PokerFinishGame, PokerBoard, BoardProtoType, Transaction, User, Setting, Analytics } = require('../../../../models');
const systemBots = require('../../../../utils/lib/system-bots');

const MAX_COMMUNITY_CARDS = 5;
const SIDE_BET_PAYOUTS = {
  'twenty-one': 3,
  flush: 4,
  straight: 5,
  'straight-flush': 10,
};

function getCardRank(card) {
  const nLabel = Number(card?.nLabel);
  if (nLabel === 1) return 14;
  return nLabel;
}

function hasRun(cards = [], nMinimumLength = 3) {
  const ranks = [...new Set(cards.map(getCardRank).filter(rank => rank > 0))].sort((a, b) => a - b);
  if (ranks.includes(14)) ranks.unshift(1);

  let nRun = 1;
  for (let index = 1; index < ranks.length; index++) {
    if (ranks[index] === ranks[index - 1] + 1) {
      nRun++;
      if (nRun >= nMinimumLength) return true;
    } else if (ranks[index] !== ranks[index - 1]) {
      nRun = 1;
    }
  }
  return false;
}

function hasFlush(cards = [], nMinimumLength = 3) {
  const suitCounts = cards.reduce((accumulator, card) => {
    const suit = String(card?.eSuit || '').toLowerCase();
    if (!suit) return accumulator;
    accumulator[suit] = (accumulator[suit] || 0) + 1;
    return accumulator;
  }, {});
  return Object.values(suitCounts).some(count => count >= nMinimumLength);
}

function hasStraightFlush(cards = [], nMinimumLength = 3) {
  const cardsBySuit = cards.reduce((accumulator, card) => {
    const suit = String(card?.eSuit || '').toLowerCase();
    if (!suit) return accumulator;
    if (!accumulator[suit]) accumulator[suit] = [];
    accumulator[suit].push(card);
    return accumulator;
  }, {});
  return Object.values(cardsBySuit).some(suitedCards => suitedCards.length >= nMinimumLength && hasRun(suitedCards, nMinimumLength));
}

function getSideBetEligibleCommunityCards(participant, communityCards = []) {
  if (!participant?.isDoubleDownLock) return Array.isArray(communityCards) ? communityCards : [];

  const nStandAtRound = Math.max(1, Number(participant.nStandAtRound) || 1);
  const nEligibleCommunityCards = Math.max(0, nStandAtRound - 1);
  return (Array.isArray(communityCards) ? communityCards : []).slice(0, nEligibleCommunityCards);
}

class Board extends Service {
  async collectBootAmount() {
    try {
      const blindMultipliers = { [this.iSmallBlindId]: 1, [this.iBigBlindId]: 2 };

      // collect nMinBet from all players
      // for (const participant of this.aParticipant) {
      //   if (participant.eState !== 'playing') continue;

      //   await participant.updateUser({ $inc: { nChips: -this.nMinBet } });
      //   this.nTableChips += this.nMinBet;
      //   participant.nChips -= this.nMinBet;
      //   participant.nLastBidChips = this.nMinBet;

      //   await Transaction.create({
      //     iUserId: participant.iUserId,
      //     iBoardId: this._id,
      //     nAmount: this.nMinBet,
      //     eType: 'debit',
      //     eMode: 'game',
      //     eStatus: 'Success',
      //     nGameRound: this.nGameRound,
      //   });
      // }

      for (const participant of this.aParticipant) {
        if (participant.eState !== 'playing') continue;

        const multiplier = blindMultipliers[participant.iUserId];
        const nReservedBlind = multiplier ? this.nMinBet * multiplier : 0;
        const oRequestedSideBets = participant.sanitizeSideBets?.(participant.oSideBets || {}) || {};
        const nRequestedSideBetTotal = participant.getSideBetTotal?.(oRequestedSideBets) || 0;
        if (nRequestedSideBetTotal > 0) {
          let nRemainingSideBetBudget = Math.max(0, (Number(participant.nChips) || 0) - nReservedBlind);
          const oCommittedSideBets = {};

          for (const [sBetType, nAmount] of Object.entries(oRequestedSideBets)) {
            const nCommitAmount = Math.min(Math.max(Number(nAmount) || 0, 0), nRemainingSideBetBudget);
            oCommittedSideBets[sBetType] = nCommitAmount;
            nRemainingSideBetBudget -= nCommitAmount;
          }

          const nCommittedSideBetTotal = participant.getSideBetTotal(oCommittedSideBets);
          if (nCommittedSideBetTotal > 0) {
            await participant.updateUser({ $inc: { nChips: -nCommittedSideBetTotal, nTotalBetAmount: nCommittedSideBetTotal } });
            participant.nChips -= nCommittedSideBetTotal;
            participant.oCommittedSideBets = oCommittedSideBets;
            participant.oSideBets = oCommittedSideBets;
            participant.bSideBetsQueuedForNextHand = false;

            await participant.recordTransaction({
              iUserId: participant.iUserId,
              iBoardId: this._id,
              nAmount: nCommittedSideBetTotal,
              eType: 'debit',
              eMode: 'side_bet',
              eStatus: 'Success',
              nGameRound: this.nGameRound,
            });

            await participant.emit('resSideBets', {
              bets: participant.oSideBets,
              total: nCommittedSideBetTotal,
              nChips: participant.nChips,
            });
          }
        }

        if (multiplier) {
          const betAmount = this.nMinBet * multiplier;

          await participant.updateUser({ $inc: { nChips: -betAmount, nTotalBetAmount: betAmount } });
          this.nTableChips += betAmount;
          participant.nChips -= betAmount;
          participant.nLastBidChips = betAmount;
          participant.nTotalBidChips = (participant.nTotalBidChips ?? 0) + betAmount;
          if (participant.nChips <= 0) {
            participant.nChips = 0;
            participant.isAllInLock = true;
            participant.bPendingAllInStandChoice = true;
            participant.nPlayerTurnCount = 0;
            participant.aUserAction = ['c', 's'];
          }

          await participant.recordTransaction({
            iUserId: participant.iUserId,
            iBoardId: this._id,
            nAmount: betAmount,
            eType: 'debit',
            eMode: 'game',
            eStatus: 'Success',
            nGameRound: this.nGameRound,
          });
        }
      }
      this.nMinBet = this.nMinBet * 2;
      this.nMaxBet = this.nTableChips;
      await this.update({ nMinBet: this.nMinBet, nMaxBet: this.nMaxBet, nTableChips: this.nTableChips, aParticipant: this.aParticipant.map(p => p.toJSON()) });

      await this.emit('resCollectBootAmount', {
        nTableChips: this.nTableChips,
        aParticipant: this.aParticipant.map(p => ({ iUserId: p.iUserId, nLastBidChips: p.nLastBidChips, nChips: p.nChips })),
      });

      await this.saveLogs([{ sAction: 'collectBootAmount', eLogType: 'game', aParticipant: this.aParticipant.map(p => ({ iUserId: p.iUserId, nLastBidChips: p.nLastBidChips })) }]);

      await this.distributeCard();
    } catch (error) {
      console.log('collectBootAmount', error);
    }
  }

  async distributeCard() {
    try {
      for (const participant of this.aParticipant) {
        if (participant.eState !== 'playing') continue;

        const oCard = this.aDeck.pop();
        participant.aCardHand.push(oCard);
        participant.nCardScore = (Number(participant.nCardScore) || 0) + (Number(oCard?.nValue) || 0);
        participant.emit('resCardHand', { aCardHand: participant.aCardHand, nCardScore: participant.nCardScore });

        participant.updateUser({ $inc: { nGamePlayed: 1 } });
      }
      await this.update({ aDeck: this.aDeck, aParticipant: this.aParticipant.map(p => p.toJSON()) });

      const userTurn = this.getParticipant(this.iUserTurn);
      if (!userTurn) return log.red('userTurn not found in distributeCard');
      await _.delay(1200);
      userTurn.takeTurn();
    } catch (error) {
      console.log('cardDistribution', error);
    }
  }

  async dealCommunityCard() {
    try {
      const oCard = this.aDeck.pop();
      this.aCommunityCard.push(oCard);

      await this.saveLogs([{ sAction: 'dealCommunityCard', eLogType: 'game', aCommunityCard: this.aCommunityCard }]);

      for (const participant of this.aParticipant) {
        if (participant.eState !== 'playing') continue;

        if (this.nTableRound < MAX_COMMUNITY_CARDS) {
          participant.nLastBidChips = 0;
          participant.nPlayerTurnCount = 0;
          participant.aUserAction = participant.aUserAction.map(action => (action === 'c' ? 'ck' : action === 'd' ? 's' : action));
          if (participant.isAllInLock && !participant.isDoubleDownLock) {
            participant.bPendingAllInStandChoice = true;
            participant.aUserAction = ['c', 's'];
          }
          // Reset per-round split counters so round-settled check works each betting round
          if (participant.bHasSplit) {
            if (!participant.bSplitHand1Locked) participant.nSplitHand1RoundCount = 0;
            if (!participant.bSplitHand2Locked) participant.nSplitHand2RoundCount = 0;
          }
        }
        if (participant.isDoubleDownLock) continue;
        participant.nCardScore = (Number(participant.nCardScore) || 0) + (Number(oCard?.nValue) || 0);

        if (participant.nCardScore > 21) {
          for (const card of this.aCommunityCard) {
            if (!card.aAceConvertedToOne) card.aAceConvertedToOne = [];

            if (participant.nCardScore > 21 && card.nValue === 11 && !card.aAceConvertedToOne.includes(participant.iUserId)) {
              card.aAceConvertedToOne.push(participant.iUserId);
              participant.bHasAceAndBust = true;
              participant.nCardScore -= 10;
            }
          }

          const oAceCardHand = participant.aCardHand.find(card => card.nValue === 11);
          if (participant.nCardScore > 21 && oAceCardHand) {
            oAceCardHand.nValue = 1;
            participant.bHasAceAndBust = true;
            participant.nCardScore -= 10;
          }

          if (participant.nCardScore > 21) {
            participant.eState = 'bust';
            await participant.foldPlayer({ sReason: 'player is bust due to score above 21', eBehaviour: 'bust' });
          }
        }

        // Update split hand score with the community card (if split hand2 is still live)
        if (participant.bHasSplit && !participant.bSplitHand2Locked) {
          participant.nSplitCardScore = (Number(participant.nSplitCardScore) || 0) + (Number(oCard?.nValue) || 0);

          if (participant.nSplitCardScore > 21) {
            for (const card of this.aCommunityCard) {
              const splitKey = participant.iUserId + '_split';
              if (!card.aAceConvertedToOne) card.aAceConvertedToOne = [];
              if (participant.nSplitCardScore > 21 && card.nValue === 11 && !card.aAceConvertedToOne.includes(splitKey)) {
                card.aAceConvertedToOne.push(splitKey);
                participant.nSplitCardScore -= 10;
              }
            }
            const oAceInSplit = participant.aSplitHand.find(c => c.nValue === 11);
            if (participant.nSplitCardScore > 21 && oAceInSplit) {
              oAceInSplit.nValue = 1;
              participant.nSplitCardScore -= 10;
            }
            if (participant.nSplitCardScore > 21) {
              participant.bSplitHand2Locked = true;
            }
          }
        }
      } // end for (participant of aParticipant)

      await this.update({ aCommunityCard: this.aCommunityCard, aParticipant: this.aParticipant.map(p => p.toJSON()) });
      await this.emit('resCommunityCard', { aCommunityCard: this.aCommunityCard, aParticipant: this.aParticipant });

      let allParticipantsAreBust = true;
      for (const participant of this.aParticipant) {
        if (participant.eState === 'playing') {
          allParticipantsAreBust = false;
          break;
        }
      }
      if (allParticipantsAreBust) return await this.declareResult([], 'dealCommunityCard: allParticipantsAreBust');

      if (this.nTableRound == MAX_COMMUNITY_CARDS) {
        let maxScore = 0;
        let aWinner = [];

        for (const participant of this.aParticipant) {
          const nParticipantScore = Number(participant.nCardScore) || 0;
          if (participant.eState === 'playing' && nParticipantScore <= 21) {
            if (nParticipantScore > maxScore) {
              maxScore = nParticipantScore;
              aWinner = [participant];
            } else if (nParticipantScore === maxScore) {
              aWinner.push(participant);
            }
          }
        }

        return await this.declareResult(aWinner, `dealCommunityCard: aWinner in ${MAX_COMMUNITY_CARDS}th round`);
      }

      // New betting rounds open at the table big blind (not previous round's final bet).
      // Proto nMinBet is the small blind in this codebase, so round-open min bet is x2.
      const oProtoBlind = await BoardProtoType.findOne({ _id: this.iProtoId }, { _id: 0, nMinBet: 1 }).lean();
      if (oProtoBlind?.nMinBet) {
        this.nMinBet = oProtoBlind.nMinBet * 2;
      }

      this.nTableRound++;
      await this.update({ nTableRound: this.nTableRound, nMinBet: this.nMinBet });

      // Restore Stand for all playing participants from round 2 onwards,
      // and grant Double Down exclusively in round 2 to eligible players.
      if (this.nTableRound === 2) {
        for (const p of this.aParticipant) {
          if (p.eState !== 'playing') continue;
          if (!p.aUserAction.includes('s')) p.aUserAction.push('s');
          if (p.isDoubleDownLock || p.bHasSplit) continue;
          if (!p.aUserAction.includes('d')) p.aUserAction.push('d');
        }
        // Persist to Redis: subsequent turns reload the board via getBoard() (event-emitter
        // driven takeTurn), so in-memory changes are lost without an explicit save.
        await this.update({ aParticipant: this.aParticipant.map(p => p.toJSON()) });
      }

      // Round opener stays fixed within a hand: player to the left of the BB.
      const bigBlind = this.getParticipant(this.iBigBlindId);
      let userTurn = bigBlind ? this.getNextParticipant(bigBlind.nSeat) : null;
      if (!userTurn) userTurn = this.getParticipant(this.iUserTurn);
      if (!userTurn) {
        const aPlayingParticipants = this.aParticipant.filter(p => p.eState === 'playing');
        userTurn = aPlayingParticipants[0];
      } else if (userTurn.eState !== 'playing') {
        userTurn = this.getNextParticipant(userTurn.nSeat);
      }

      if (!userTurn || userTurn.eState !== 'playing') {
        const aPlayingParticipants = this.aParticipant.filter(p => p.eState === 'playing');
        if (aPlayingParticipants.length <= 1) return await this.declareResult(aPlayingParticipants, 'dealCommunityCard: invalid userTurn fallback');
        return log.red('userTurn not found in dealCommunityCard');
      }

      const nRevealDelay = Math.max(Number(this.oSetting?.nAnimationCountdown) || 0, 850);
      await _.delay(nRevealDelay);
      userTurn.takeTurn();
    } catch (error) {
      console.log('dealCommunityCard', error);
    }
  }

  evaluateSideBets(participant) {
    const oCommittedSideBets = participant.sanitizeSideBets?.(participant.oCommittedSideBets || {}) || {};
    const nStake = participant.getSideBetTotal?.(oCommittedSideBets) || 0;
    if (!nStake) return null;

    const aEligibleCommunityCards = getSideBetEligibleCommunityCards(participant, this.aCommunityCard);
    const cards = [
      ...(Array.isArray(participant.aCardHand) ? participant.aCardHand : []),
      ...aEligibleCommunityCards,
    ];
    const bTwentyOne = Number(participant.nCardScore) === 21;
    const bHasMinimumSideBetCards = cards.length >= 3;
    const bFlush = bHasMinimumSideBetCards && hasFlush(cards, 3);
    const bStraightFlush = bHasMinimumSideBetCards && hasStraightFlush(cards, 3);
    const bStraight = bHasMinimumSideBetCards && (bStraightFlush || hasRun(cards, 3));

    const aResults = [];
    let nTotalCredit = 0;

    const addResult = (sBetType, bWon, nMultiplier) => {
      const nAmount = Math.max(0, Number(oCommittedSideBets[sBetType]) || 0);
      if (!nAmount) return;
      const nWinAmount = bWon ? nAmount * nMultiplier : 0;
      const nCreditAmount = bWon ? nAmount + nWinAmount : 0;
      nTotalCredit += nCreditAmount;
      aResults.push({
        type: sBetType,
        stake: nAmount,
        won: bWon,
        multiplier: bWon ? nMultiplier : 0,
        winAmount: nWinAmount,
        creditAmount: nCreditAmount,
      });
    };

    addResult('twenty-one', bTwentyOne, SIDE_BET_PAYOUTS['twenty-one']);
    addResult('flush', bFlush, SIDE_BET_PAYOUTS.flush);
    addResult('straight', bStraight, bStraightFlush ? SIDE_BET_PAYOUTS['straight-flush'] : SIDE_BET_PAYOUTS.straight);

    return {
      stake: nStake,
      creditAmount: nTotalCredit,
      results: aResults,
      qualifiers: {
        twentyOne: bTwentyOne,
        flush: bFlush,
        straight: bStraight,
        straightFlush: bStraightFlush,
        eligibleCommunityCards: aEligibleCommunityCards.length,
      },
    };
  }

  async resolveSideBets() {
    for (const participant of this.aParticipant) {
      const oSideBetResult = this.evaluateSideBets(participant);
      if (!oSideBetResult) continue;

      participant.oSideBetResult = oSideBetResult;
      if (oSideBetResult.creditAmount > 0) {
        participant.nChips += oSideBetResult.creditAmount;
        participant.nWinningAmount += oSideBetResult.creditAmount;
        await participant.updateUser({ $inc: { nChips: oSideBetResult.creditAmount, nTotalWinningAmount: oSideBetResult.creditAmount } });
        await participant.recordTransaction({
          iUserId: participant.iUserId,
          iBoardId: this._id,
          nAmount: oSideBetResult.creditAmount,
          eType: 'credit',
          eMode: 'side_bet',
          eStatus: 'Success',
          nGameRound: this.nGameRound,
        });
      }

      if (!participant.bSideBetsQueuedForNextHand) participant.oSideBets = {};
      participant.oCommittedSideBets = {};
      await participant.emit('resSideBets', {
        bets: participant.oSideBets || {},
        total: participant.getSideBetTotal?.(participant.oSideBets || {}) || 0,
        nChips: participant.nChips,
        results: oSideBetResult,
      });
    }
  }

  async declareResult(aWinner, functionCalledFrom) {
    try {
      const turnScheduler = await this.getScheduler('assignTurnTimeout');
      if (turnScheduler) await this.deleteScheduler('assignTurnTimeout');

      this.eState = 'finished';
      const oTutorialHand = this.getTutorialHandConfig ? this.getTutorialHandConfig() : null;
      const bTutorialCompleted = Boolean(this.isTutorialTable && this.isTutorialTable() && this.oTutorial && (Number(this.oTutorial.nHandIndex) || 0) >= this.getTutorialHands().length - 1);

      // ------------------------------ Pot Distribution ------------------------------
      if (aWinner.length) {
        const aTransactionData = [];
        const setting = this.isGuestTable() ? { nRakeAmount: 0 } : await Setting.findOne({}, { _id: 0, nRakeAmount: 1 }).lean();
        const adminRakeAmount = (this.nTableChips * setting.nRakeAmount) / 100;
        if (!this.isGuestTable()) {
          aTransactionData.push({
            iUserId: mongodb.mongify('5d3586d3e3cdfd095f9af778'),
            iBoardId: this._id,
            nAmount: adminRakeAmount,
            eType: 'credit',
            eMode: 'game',
            eStatus: 'Success',
            sDescription: 'adminRakeAmountCredit',
            nGameRound: this.nGameRound,
          });
        }

        const getContribution = participant => Math.max(Number(participant.nTotalBidChips) || 0, 0);
        // For split players, use the best valid hand score; for others, use nCardScore
        const getEffectiveScore = (p) => {
          if (!p.bHasSplit) return Number(p.nCardScore) || 0;
          const s1 = Number(p.nCardScore) || 0;
          const s2 = Number(p.nSplitCardScore) || 0;
          const v1 = s1 <= 21 ? s1 : -1;
          const v2 = (!p.bSplitHand2Locked && s2 <= 21) ? s2 : -1;
          return Math.max(v1, v2);
        };
        const payoutByUserId = new Map();
        const showdownEligible = this.aParticipant.filter(p => {
          if (p.eState !== 'playing') return false;
          if (p.bHasSplit) return getEffectiveScore(p) > 0;
          return (Number(p.nCardScore) || 0) <= 21;
        });
        const showdownEligibleIds = new Set(showdownEligible.map(p => _.toString(p.iUserId)));
        const contributedPlayers = this.aParticipant.filter(p => getContribution(p) > 0);
        const contributionLevels = [...new Set(contributedPlayers.map(getContribution).filter(v => v > 0))].sort((a, b) => a - b);
        const totalTrackedContrib = contributedPlayers.reduce((sum, p) => sum + getContribution(p), 0);
        const maxContribution = contributedPlayers.reduce((max, p) => Math.max(max, getContribution(p)), 0);
        const hasCappedAllInContribution = contributedPlayers.some(
          participant => participant.isAllInLock && getContribution(participant) > 0 && getContribution(participant) < maxContribution
        );
        const nDistributablePot = this.nTableChips - adminRakeAmount;
        const aSidePotSummary = [];

        const creditWinner = (participant, nAmount) => {
          if (!(nAmount > 0)) return;
          const key = _.toString(participant.iUserId);
          payoutByUserId.set(key, (payoutByUserId.get(key) || 0) + nAmount);
        };

        const distributeSinglePotFallback = () => {
          const chipsPerWinner = nDistributablePot / aWinner.length;
          for (const winner of aWinner) creditWinner(winner, chipsPerWinner);
          aSidePotSummary.push({
            eType: 'single-pot-fallback',
            nAmount: this.nTableChips,
            nNetAmount: nDistributablePot,
            aWinner: aWinner.map(w => _.toString(w.iUserId)),
          });
        };

        if (!hasCappedAllInContribution || !contributionLevels.length || Math.abs(totalTrackedContrib - this.nTableChips) > 0.000001) {
          distributeSinglePotFallback();
        } else {
          let nPrevLevel = 0;
          for (const nLevel of contributionLevels) {
            const aPotContributors = contributedPlayers.filter(p => getContribution(p) >= nLevel);
            const nGrossPotAmount = (nLevel - nPrevLevel) * aPotContributors.length;
            nPrevLevel = nLevel;
            if (!(nGrossPotAmount > 0)) continue;

            const aPotContestants = aPotContributors.filter(p => showdownEligibleIds.has(_.toString(p.iUserId)));
            if (!aPotContestants.length) {
              aSidePotSummary.push({
                eType: 'unawarded-side-pot',
                nAmount: nGrossPotAmount,
                aContributor: aPotContributors.map(p => _.toString(p.iUserId)),
              });
              continue;
            }

            let nMaxScore = 0;
            let aPotWinners = [];
            for (const participant of aPotContestants) {
              const nParticipantScore = getEffectiveScore(participant);
              if (nParticipantScore > nMaxScore) {
                nMaxScore = nParticipantScore;
                aPotWinners = [participant];
              } else if (nParticipantScore === nMaxScore) {
                aPotWinners.push(participant);
              }
            }

            const nNetPotAmount = (nGrossPotAmount * nDistributablePot) / this.nTableChips;
            const nPerWinner = nNetPotAmount / aPotWinners.length;
            for (const winner of aPotWinners) creditWinner(winner, nPerWinner);

            aSidePotSummary.push({
              eType: 'side-pot',
              nAmount: nGrossPotAmount,
              nNetAmount: nNetPotAmount,
              nScore: nMaxScore,
              aContributor: aPotContributors.map(p => _.toString(p.iUserId)),
              aWinner: aPotWinners.map(p => _.toString(p.iUserId)),
            });
          }
        }

        const aPayoutEntries = [...payoutByUserId.entries()];
        let nDistributedAmount = aPayoutEntries.reduce((sum, [, nAmount]) => sum + nAmount, 0);
        const nRemainder = nDistributablePot - nDistributedAmount;
        if (Math.abs(nRemainder) > 0.000001 && Math.abs(nRemainder) <= 0.01 && aPayoutEntries.length) {
          const [firstWinnerId] = aPayoutEntries[0];
          payoutByUserId.set(firstWinnerId, (payoutByUserId.get(firstWinnerId) || 0) + nRemainder);
          nDistributedAmount += nRemainder;
          aSidePotSummary.push({ eType: 'rounding-adjustment', iUserId: firstWinnerId, nAmount: nRemainder });
        } else if (Math.abs(nRemainder) > 0.01) {
          aSidePotSummary.push({ eType: 'undistributed-balance', nAmount: nRemainder });
        }

        for (const participant of this.aParticipant) {
          const nPayoutAmount = payoutByUserId.get(_.toString(participant.iUserId)) || 0;
          if (!(nPayoutAmount > 0)) continue;

          participant.eState = 'winner';
          participant.nChips += nPayoutAmount;
          participant.nWinningAmount += nPayoutAmount;

          await participant.updateUser({ $inc: { nChips: nPayoutAmount, nGameWon: 1, nTotalWinningAmount: nPayoutAmount } });
          aTransactionData.push({
            iUserId: participant.iUserId,
            iBoardId: this._id,
            nAmount: nPayoutAmount,
            eType: 'credit',
            eMode: 'game',
            eStatus: 'Success',
            nGameRound: this.nGameRound,
          });
        }

        if (!this.isGuestTable() && aTransactionData.length) await Transaction.insertMany(aTransactionData);
        await this.saveLogs([
          {
            sAction: 'potDistribution',
            eLogType: 'game',
            nTableChips: this.nTableChips,
            adminRakeAmount,
            aSidePotSummary,
          },
        ]);
      }
      // ------------------------------ End of Pot Distribution ------------------------------

      await this.resolveSideBets();

      await this.update({ aParticipant: this.aParticipant.map(p => p.toJSON()), eState: this.eState });

      const nClientShowdownMs = 6000;
      const nSideBetWindowMs = 10000;
      const resultData = {
        nRoundStartsIn: bTutorialCompleted ? 0 : nClientShowdownMs + nSideBetWindowMs,
        aParticipant: this.aParticipant.map(p => ({
          iUserId: p.iUserId,
          eState: p.eState,
          nWinningAmount: p.nWinningAmount,
          nChips: p.nChips,
          aCardHand: p.aCardHand,
          nCardScore: p.nCardScore,
          oSideBetResult: p.oSideBetResult,
        })),
        nTableChips: 0,
        oTutorial:
          this.isTutorialTable && this.isTutorialTable()
            ? {
                ...(this.oTutorial || {}),
                sCurrentHandKey: oTutorialHand?.sKey,
                sExpectedAction: oTutorialHand?.sExpectedAction,
                bCompleted: bTutorialCompleted,
              }
            : undefined,
      };

      if (!aWinner.length) {
        resultData.sReason = 'All players are bust';
        resultData.bAllPlayersBust = true;
        resultData.bAllPlayerBust = true;
      }

      const aPlayingPlayers = this.aParticipant.filter(p => !p.bNextTurnLeave);
      if (aPlayingPlayers.length < 3) resultData.nRoundStartsIn = 4000;

      if (!(bTutorialCompleted && this.isTutorialTable && this.isTutorialTable())) {
        this.setSchedular('resetTable', null, resultData.nRoundStartsIn);
      } else {
        this.oTutorial = {
          ...(this.oTutorial || {}),
          bCompleted: true,
        };
        await this.update({ oTutorial: this.oTutorial });
      }
      await this.emit('resDeclareResult', resultData);

      await this.saveLogs([{ sAction: 'declareResult', eLogType: 'game', ...(!aWinner.length && { sReason: 'All players are bust' }), functionCalledFrom }]);
      emitter.emit('saveBoardHistory', this._id);
    } catch (error) {
      console.log('declareResult', error);
    }
  }

  async resetTable() {
    try {
      const proto = await BoardProtoType.findOne({ _id: this.iProtoId }, { _id: 0, nMinBet: 1, nMinBuyIn: 1 }).lean();
      const aAutoTopUp = [];

      for (const participant of this.aParticipant) {
        participant.resetForNextHand?.();

        if (participant.bNextTurnLeave) {
          // Bots on a live table get refilled and re-seated instead of leaving
          if (participant.isBotUser() && this.isLiveTable()) {
            await systemBots.topUpBotBankroll({
              iUserId: participant.iUserId,
              nMinRequiredChips: proto.nMinBuyIn,
              sReason: `System bot auto top-up (leave) for board ${this._id}`,
            });
            participant.nChips = proto.nMinBuyIn;
            participant.bNextTurnLeave = false;
            participant.eState = 'waiting';
            aAutoTopUp.push({ iUserId: participant.iUserId, nTopUpTo: proto.nMinBuyIn, bShopAutoTopUp: true });
            await this.update({ aParticipant: [participant.toJSON()] });
            continue;
          }
          participant.eState = 'leave';
        } else if (participant.nChips < proto.nMinBet * 2) {
          if (participant.isBotUser() && this.isLiveTable()) {
            await systemBots.topUpBotBankroll({
              iUserId: participant.iUserId,
              nMinRequiredChips: proto.nMinBuyIn,
              sReason: `System bot auto top-up for board ${this._id}`,
            });
            participant.nChips = proto.nMinBuyIn;
            participant.eState = 'waiting';
            aAutoTopUp.push({ iUserId: participant.iUserId, nTopUpTo: proto.nMinBuyIn, bShopAutoTopUp: true });
            await this.update({ aParticipant: [participant.toJSON()] });
            continue;
          }
          if (this.isGuestTable()) {
            participant.nChips = proto.nMinBuyIn;
            participant.eState = 'waiting';
            aAutoTopUp.push({ iUserId: participant.iUserId, nTopUpTo: proto.nMinBuyIn });
            await this.update({ aParticipant: [participant.toJSON()] });
            continue;
          }
          const user = await User.findOne({ _id: participant.iUserId }, { _id: 0, nChips: 1 }).lean();
          const bCanAutoTopUp = user && Number(user.nChips) >= Number(proto.nMinBuyIn);

          if (bCanAutoTopUp) {
            participant.nChips = proto.nMinBuyIn;
            participant.eState = 'waiting';
            aAutoTopUp.push({ iUserId: participant.iUserId, nTopUpTo: proto.nMinBuyIn });
          } else {
            participant.eState = 'leave';
          }
        } else participant.eState = 'waiting';

        await this.update({ aParticipant: [participant.toJSON()] });
      }

      const aLeftPlayers = this.aParticipant.filter(p => p.eState === 'leave');
      if (aLeftPlayers.length) await this.handleLeftPlayers(aLeftPlayers);

      this.aParticipant = this.aParticipant.filter(p => p.eState === 'waiting');
      if (this.isLiveTable()) {
        const aHumanParticipants = this.aParticipant.filter(participant => participant.eUserType !== 'bot');
        if (!aHumanParticipants.length) {
          const aBotParticipants = this.aParticipant.filter(participant => participant.eUserType === 'bot');
          if (aBotParticipants.length) {
            aBotParticipants.forEach(participant => {
              participant.eState = 'leave';
            });
            await this.handleLeftPlayers(aBotParticipants);
          }
          this.aParticipant = [];
        }
      }
      this.aCommunityCard = [];
      this.aDeck = deck.getDeck(1);
      this.nTableChips = 0;
      this.eState = 'waiting';
      this.nMinBet = proto.nMinBet;
      this.nMaxBet = 0;
      this.nTableRound = 1;
      this.nGameRound = this.nGameRound + 1;
      if (this.isTutorialTable()) {
        const nNextHandIndex = ((Number(this.oTutorial?.nHandIndex) || 0) + 1) % this.getTutorialHands().length;
        this.oTutorial = {
          ...(this.oTutorial || {}),
          nHandIndex: nNextHandIndex,
          bCompleted: false,
        };
        this.prepareTutorialHand();
      }

      await this.update({
        eState: this.eState,
        aDeck: this.aDeck,
        aCommunityCard: this.aCommunityCard,
        nMinBet: proto.nMinBet,
        nMaxBet: this.nMaxBet,
        nTableRound: this.nTableRound,
        nGameRound: this.nGameRound,
        nTableChips: this.nTableChips,
        oTutorial: this.oTutorial,
        aParticipant: this.aParticipant,
      });

      if (!this.aParticipant.length) {
        return emitter.emit('flushBoard', { iBoardId: this._id, iProtoId: this.iProtoId }); // no player left in table. -> finish state
      }

      if (this.aParticipant.length < 3) {
        this.emit('resRefundOnLongWait', { message: 'Please wait for other players to join', nMaxWaitingTime: this.oSetting.nMaxWaitingTime });
        return this.setSchedular('refundOnLongWait', '', this.oSetting.nMaxWaitingTime);
      }

      await this.saveLogs([
        { sAction: 'resetTable', eLogType: 'game', aParticipant: this.aParticipant.map(p => ({ iUserId: p.iUserId, sUserName: p.sUserName, eState: p.eState })) },
        ...(aAutoTopUp.length ? [{ sAction: 'autoTopUpChips', eLogType: 'game', aAutoTopUp }] : []),
      ]);

      this.initializeGame();
    } catch (error) {
      console.log('resetTable', error);
    }
  }

  async handleLeftPlayers(aLeftPlayers) {
    try {
      for (const participant of aLeftPlayers) {
        const query = { iBoardId: this._id };
        if (this.sPrivateCode) {
          query.sPrivateCode = this.sPrivateCode;
          await User.updateOne({ _id: participant.iUserId }, { $unset: { sPrivateCode: 1 } });
        } else query.iProtoId = this.iProtoId;
        const pokerBoard = await PokerBoard.findOneAndUpdate(query, { $pull: { aParticipants: participant.iUserId } }, { new: true }).lean();
        if (!pokerBoard) log.red('handleLeftPlayers :: Board not found while leaving');

        await redis.client.json.del(_.getBoardKey(this._id), `.aParticipant_${participant.iUserId}`);
        await redis.client.json.del(_.getBoardKey(this._id), `.aParticipant-${participant.iUserId}`);

        await User.updateOne({ _id: participant.iUserId }, { $pull: { aPokerBoard: this._id } });

        await participant.emit('resFoldPlayer', {
          iUserId: participant.iUserId,
          oLeave: {
            eBehaviour: 'leave',
            sReason: "Oh no! You don't have enough chips to play here, Would you like to visit the store to top up your bankroll?",
            bShowMessage: true,
          },
        });

        delete this.oSocketId[participant.iUserId];
        await this.update({ oSocketId: this.oSocketId });

        if (pokerBoard && !pokerBoard.aParticipants.length) {
          await PokerBoard.deleteOne(query);
          const keys = await redis.client.keys(`${this._id}:*`);
          if (keys.length) await redis.client.unlink(keys);
          await this.deleteScheduler('refundOnLongWait', '');
        }

        if (participant.dGameStartedAt !== 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          await Analytics.findOneAndUpdate(
            { iUserId: participant.iUserId, dCreatedDate: { $gte: today } },
            { $inc: { nInGameTime: Math.floor((Date.now() - participant.dGameStartedAt) / 1000) } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }
    } catch (error) {
      console.log('handleLeftPlayers', error);
    }
  }

  async saveLogs(_aLog = []) {
    try {
      if (!_aLog.length) return false;

      const aLog = [];
      for (const oLog of _aLog) {
        oLog.nTableRound = this.nTableRound;
        aLog.push(oLog);
      }
      if (!aLog.length) return false;
      const existingLogs = await redis.client.json.GET(_.getBoardLogsKey(this._id));
      await redis.client.json.SET(_.getBoardLogsKey(this._id), '$', existingLogs ? [...existingLogs, ...aLog] : aLog);

      const [game] = await PokerFinishGame.find({ iBoardId: this._id, nGameRound: this.nGameRound }).sort({ nGameRound: -1 }).limit(1);
      if (!game) return false;
      if (!game.aLog.length) game.aLog = [];
      game.aLog.unshift(...aLog);
      await game.save();
    } catch (error) {
      console.log('saveLogs', error);
    }
  }

  async refundOnLongWait() {
    try {
      this.emit('resKickOut', { message: messages.custom.no_player_found });

      const query = { iBoardId: this._id };
      if (this.sPrivateCode) {
        query.sPrivateCode = this.sPrivateCode;

        const aParticipantUserIds = [];
        for (const participant of this.aParticipant) aParticipantUserIds.push(participant.iUserId);
        await User.updateMany({ _id: { $in: aParticipantUserIds } }, { $unset: { sPrivateCode: 1 } });
      } else query.iProtoId = this.iProtoId;
      await PokerBoard.deleteOne(query);
      const keys = await redis.client.keys(`${this._id}:*`);
      await redis.client.unlink(keys);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const participant of this.aParticipant) {
        await User.updateOne({ _id: participant.iUserId }, { $pull: { aPokerBoard: this._id } });
        if (participant.dGameStartedAt !== 0) {
          await Analytics.findOneAndUpdate(
            { iUserId: participant.iUserId, dCreatedDate: { $gte: today } },
            { $inc: { nInGameTime: Math.floor((Date.now() - participant.dGameStartedAt) / 1000) } },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }
    } catch (error) {
      console.log('refundOnLongWait', error);
    }
  }

  async emit(sEventName, oData) {
    try {
      const board = await redis.client.json.GET(_.getBoardKey(this._id));
      if (!board) return log.red(`emit :: Board not found :: ${this._id} :: sEventName :: ${sEventName}`);
      Object.values(board?.oSocketId).forEach(sRootSocket => {
        if (sRootSocket) global.io.to(sRootSocket).emit(this._id, { sEventName, oData });
      });
    } catch (error) {
      console.log('emit', error);
    }
  }
}

module.exports = Board;
