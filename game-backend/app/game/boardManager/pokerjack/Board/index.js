const Service = require('./lib/Service');
const { redis, deck, mongodb } = require('../../../../utils');
const { PokerFinishGame, PokerBoard, BoardProtoType, Transaction, User, Setting, Analytics } = require('../../../../models');

const MAX_COMMUNITY_CARDS = 5;

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
        if (multiplier) {
          const betAmount = this.nMinBet * multiplier;

          await participant.updateUser({ $inc: { nChips: -betAmount } });
          this.nTableChips += betAmount;
          participant.nChips -= betAmount;
          participant.nLastBidChips = betAmount;
          participant.nTotalBidChips = (participant.nTotalBidChips ?? 0) + betAmount;
          if (participant.nChips <= 0) {
            participant.nChips = 0;
            participant.isAllInLock = true;
            participant.aUserAction = ['f'];
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
        participant.nCardScore += oCard.nValue;
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
        }
        if (participant.isDoubleDownLock) continue;
        participant.nCardScore += oCard.nValue;

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
        // Calculate the score of the participant "Hand" Score
        // if (participant.nCardScore > 21) {
        //   const oAceCardHand = participant.aCardHand.find(card => card.nValue === 11);
        //   if (oAceCardHand) {
        //     oAceCardHand.nValue = 1;
        //     participant.bHasAceAndBust = true;
        //     participant.nCardScore -= 10;
        //   } else {
        //     participant.eState = 'bust';
        //     await participant.foldPlayer({ sReason: 'player is bust due to score above 21', eBehaviour: 'bust' });
        //   }
        // } else if (participant.nCardScore === 21) aWinner.push(participant);
      }

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
          if (participant.eState == 'playing' && participant.nCardScore <= 21) {
            if (participant.nCardScore > maxScore) {
              maxScore = participant.nCardScore;
              aWinner = [participant];
            } else if (participant.nCardScore === maxScore) {
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
      userTurn.takeTurn();
    } catch (error) {
      console.log('dealCommunityCard', error);
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
        const payoutByUserId = new Map();
        const showdownEligible = this.aParticipant.filter(p => p.eState === 'playing' && p.nCardScore <= 21);
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
              if (participant.nCardScore > nMaxScore) {
                nMaxScore = participant.nCardScore;
                aPotWinners = [participant];
              } else if (participant.nCardScore === nMaxScore) {
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

          await participant.updateUser({ $inc: { nChips: nPayoutAmount, nGameWon: 1 } });
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

      await this.update({ aParticipant: this.aParticipant.map(p => p.toJSON()), eState: this.eState });

      const resultData = {
        nRoundStartsIn: bTutorialCompleted ? 0 : this.oSetting.nRoundStartsIn + 4000,
        aParticipant: this.aParticipant.map(p => ({
          iUserId: p.iUserId,
          eState: p.eState,
          nWinningAmount: p.nWinningAmount,
          nChips: p.nChips,
          aCardHand: p.aCardHand,
          nCardScore: p.nCardScore,
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
        participant.aCardHand = [];
        participant.aUserAction = ['c', 'r', 'f', 'd'];
        participant.nCardScore = 0;
        participant.isDoubleDownLock = false;
        participant.isAllInLock = false;
        participant.bHasAceAndBust = false;
        participant.nStandAtRound = 0;
        participant.nLastBidChips = 0;
        participant.nTotalBidChips = 0;
        participant.nWinningAmount = 0;
        participant.nPlayerTurnCount = 0;

        if (participant.bNextTurnLeave) {
          participant.eState = 'leave';
        } else if (participant.nChips < proto.nMinBet * 2) {
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
