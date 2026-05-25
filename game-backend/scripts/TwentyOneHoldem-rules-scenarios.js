#!/usr/bin/env node

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret';

require('../globals');

const assert = require('assert/strict');
const Participant = require('../app/game/boardManager/TwentyOneHoldem/Participant');
const Board = require('../app/game/boardManager/TwentyOneHoldem/Board');
const { BoardProtoType } = require('../app/models');

BoardProtoType.findOne = () => ({
  lean: async () => ({ nMinBet: 50 }),
});

function participantData(overrides = {}) {
  return {
    iUserId: overrides.iUserId || 'u1',
    sUserName: overrides.sUserName || overrides.iUserId || 'u1',
    eUserType: overrides.eUserType || 'user',
    nSeat: overrides.nSeat || 1,
    aCardHand: overrides.aCardHand || [{ _id: `${overrides.iUserId || 'u1'}-hole`, nLabel: 9, nValue: 9, eSuit: 's' }],
    eState: overrides.eState || 'playing',
    nChips: overrides.nChips ?? 1000,
    aUserAction: overrides.aUserAction || ['c', 'r', 'f'],
    isDoubleDownLock: overrides.isDoubleDownLock || false,
    isAllInLock: overrides.isAllInLock || false,
    bPendingAllInStandChoice: overrides.bPendingAllInStandChoice || false,
    nCardScore: overrides.nCardScore ?? 9,
    bHasSplit: false,
    nLastBidChips: overrides.nLastBidChips || 0,
    nTotalBidChips: overrides.nTotalBidChips || 0,
    nPlayerTurnCount: overrides.nPlayerTurnCount || 0,
  };
}

function createFakeBoard(aParticipantData, overrides = {}) {
  const board = {
    _id: 'scenario-board',
    eState: 'playing',
    nMinBet: overrides.nMinBet ?? 100,
    nTableChips: overrides.nTableChips ?? 0,
    nMaxBet: overrides.nMaxBet ?? 0,
    nTableRound: overrides.nTableRound ?? 2,
    nGameRound: 1,
    iUserTurn: overrides.iUserTurn || aParticipantData[0].iUserId,
    oSetting: { nTurnTime: 20, nTurnBuffer: 0 },
    aParticipant: [],
    update: async () => {},
    emit: async () => {},
    saveLogs: async () => {},
    deleteScheduler: async () => {},
    setSchedular: async () => {},
    getScheduler: async () => null,
    isTutorialTable: () => false,
  };

  board.aParticipant = aParticipantData.map(data => new Participant(data, board));
  board.aParticipant.forEach(participant => {
    participant.updateUser = async () => {};
    participant.recordTransaction = async () => {};
  });
  return board;
}

function createCallbackCapture() {
  const result = { called: false, payload: null };
  result.callback = payload => {
    result.called = true;
    result.payload = payload;
  };
  return result;
}

async function confirmedAllInRaiseDoesNotReopenStandFold() {
  const board = createFakeBoard([
    participantData({ iUserId: 'allin', nChips: 500, nCardScore: 11 }),
    participantData({ iUserId: 'caller', nChips: 2000, nSeat: 2 }),
  ]);
  const player = board.aParticipant[0];
  player.passTurn = async () => true;

  await player.raise({ nRaiseAmount: 500, bAllIn: true, bTakeCard: true }, () => {});

  assert.equal(player.nChips, 0);
  assert.equal(player.isAllInLock, true);
  assert.equal(player.bPendingAllInStandChoice, false);
  assert.deepEqual(player.aUserAction, ['c', 'f']);
}

async function raiseIsRejectedAfterOpponentAllIn() {
  const board = createFakeBoard([
    participantData({ iUserId: 'allin', nChips: 0, isAllInLock: true, aUserAction: ['c', 'f'] }),
    participantData({ iUserId: 'raiser', nChips: 2000, nSeat: 2 }),
  ]);
  const raiser = board.aParticipant[1];
  const callback = createCallbackCapture();

  await raiser.raise({ nRaiseAmount: 100 }, callback.callback);

  assert.equal(callback.called, true);
  assert.match(callback.payload.error, /unavailable after a player is all-in/);
}

async function communityCardReopensAllInConfirmStandChoice() {
  const board = new Board({
    _id: 'scenario-board',
    iProtoId: 'proto',
    eState: 'playing',
    nMinBet: 100,
    nTableRound: 2,
    iBigBlindId: 'caller',
    iUserTurn: 'allin',
    oSetting: { nTurnTime: 20, nTurnBuffer: 0 },
    aDeck: [{ _id: 'cc1', nLabel: 2, nValue: 2, eSuit: 'h' }],
    aCommunityCard: [],
    aParticipant: [
      participantData({ iUserId: 'allin', nChips: 0, isAllInLock: true, bPendingAllInStandChoice: false, aUserAction: ['c', 'f'], nCardScore: 11 }),
      participantData({ iUserId: 'caller', nChips: 1000, nSeat: 2, nCardScore: 12 }),
    ],
  });

  board.update = async () => {};
  board.emit = async () => {};
  board.saveLogs = async () => {};
  board.declareResult = async () => {};
  board.aParticipant.forEach(participant => {
    participant.takeTurn = async () => true;
    participant.foldPlayer = async () => {};
  });

  await board.dealCommunityCard();

  const allInPlayer = board.aParticipant[0];
  assert.equal(allInPlayer.bPendingAllInStandChoice, true);
  assert.deepEqual(allInPlayer.aUserAction, ['c', 's']);
}

async function allInConfirmChoiceClearsPendingState() {
  const board = createFakeBoard([
    participantData({ iUserId: 'allin', nChips: 0, isAllInLock: true, bPendingAllInStandChoice: true, aUserAction: ['c', 's'] }),
    participantData({ iUserId: 'caller', nSeat: 2 }),
  ]);
  const player = board.aParticipant[0];
  let passed = false;
  player.passTurn = async () => {
    passed = true;
    return true;
  };

  await player.check({}, () => {});

  assert.equal(player.bPendingAllInStandChoice, false);
  assert.deepEqual(player.aUserAction, ['c', 'f']);
  assert.equal(passed, true);
}

async function botAllInStandChoiceAutoConfirms() {
  const board = createFakeBoard([
    participantData({ iUserId: 'bot-allin', eUserType: 'bot', nChips: 0, isAllInLock: true, bPendingAllInStandChoice: true, aUserAction: ['c', 's'], nCardScore: 12 }),
    participantData({ iUserId: 'caller', nSeat: 2, nLastBidChips: 100, nPlayerTurnCount: 1 }),
  ]);
  const bot = board.aParticipant[0];
  let passed = false;
  bot.passTurn = async () => {
    passed = true;
    return true;
  };

  await bot.takeTurn();
  await new Promise(resolve => setTimeout(resolve, 1100));

  assert.equal(bot.bPendingAllInStandChoice, false);
  assert.deepEqual(bot.aUserAction, ['c', 'f']);
  assert.equal(passed, true);
}

async function allInStandChoiceTimeoutConfirmsInsteadOfFolding() {
  const board = createFakeBoard([
    participantData({ iUserId: 'allin', nChips: 0, isAllInLock: true, bPendingAllInStandChoice: true, aUserAction: ['c', 's'] }),
    participantData({ iUserId: 'caller', nSeat: 2 }),
  ]);
  const player = board.aParticipant[0];
  let passed = false;
  player.passTurn = async () => {
    passed = true;
    return true;
  };

  await player.turnMissed();

  assert.equal(player.eState, 'playing');
  assert.equal(player.bPendingAllInStandChoice, false);
  assert.deepEqual(player.aUserAction, ['c', 'f']);
  assert.equal(passed, true);
}

async function allInConfirmChoiceWaitsForLiveBettingToSettle() {
  const board = createFakeBoard([
    participantData({
      iUserId: 'allin',
      nChips: 0,
      isAllInLock: true,
      bPendingAllInStandChoice: true,
      aUserAction: ['c', 's'],
      nLastBidChips: 0,
      nPlayerTurnCount: 0,
    }),
    participantData({
      iUserId: 'caller',
      nSeat: 2,
      nChips: 1000,
      nLastBidChips: 100,
      nPlayerTurnCount: 0,
      aUserAction: ['c', 'f'],
    }),
    participantData({
      iUserId: 'raiser',
      nSeat: 3,
      nChips: 1000,
      nLastBidChips: 200,
      nPlayerTurnCount: 1,
      aUserAction: ['c', 'f'],
    }),
  ], { nMinBet: 200 });
  const allInPlayer = board.aParticipant[0];
  let emittedTurn = false;
  let passed = false;
  board.emit = async (eventName) => {
    if (eventName === 'resPlayerTurn') emittedTurn = true;
  };
  allInPlayer.passTurn = async () => {
    passed = true;
    return true;
  };

  await allInPlayer.takeTurn();

  assert.equal(emittedTurn, false);
  assert.equal(passed, true);
  assert.equal(allInPlayer.bPendingAllInStandChoice, true);
}

async function raiseFromCheckStateReopensCallForOtherPlayers() {
  const board = createFakeBoard([
    participantData({ iUserId: 'opener', nChips: 1000, nLastBidChips: 100, aUserAction: ['ck', 'r', 'f'] }),
    participantData({ iUserId: 'caller', nChips: 1000, nSeat: 2, nLastBidChips: 100, nPlayerTurnCount: 1, aUserAction: ['ck', 'r', 'f'] }),
  ], { nMinBet: 100, nMaxBet: 1000 });
  const opener = board.aParticipant[0];
  const caller = board.aParticipant[1];
  opener.passTurn = async () => true;

  await opener.raise({ nRaiseAmount: 100, bTakeCard: true }, () => {});

  assert.equal(board.nMinBet, 200);
  assert.equal(opener.nLastBidChips, 200);
  assert.equal(caller.nPlayerTurnCount, 0);

  const bCheckOpenState = caller.aUserAction.includes('ck') && !caller.aUserAction.includes('c');
  const toCallAmount = bCheckOpenState ? 0 : Math.max(board.nMinBet - caller.nLastBidChips, 0);
  assert.equal(toCallAmount, 100);
}

async function allInBlindNeverReceivesStandFoldChoice() {
  const board = new Board({
    _id: 'scenario-board',
    iProtoId: 'proto',
    eState: 'playing',
    nMinBet: 50,
    nTableRound: 1,
    iSmallBlindId: 'small',
    iBigBlindId: 'big',
    iUserTurn: 'opener',
    oSetting: { nTurnTime: 20, nTurnBuffer: 0 },
    aDeck: [],
    aCommunityCard: [],
    aParticipant: [
      participantData({ iUserId: 'small', nChips: 25, nSeat: 1, nCardScore: 10 }),
      participantData({ iUserId: 'big', nChips: 1000, nSeat: 2, nCardScore: 12 }),
      participantData({ iUserId: 'opener', nChips: 1000, nSeat: 3, nCardScore: 13 }),
    ],
  });

  board.update = async () => {};
  board.emit = async () => {};
  board.saveLogs = async () => {};
  board.distributeCard = async () => {};
  board.aParticipant.forEach(participant => {
    participant.updateUser = async () => {};
    participant.recordTransaction = async () => {};
  });

  await board.collectBootAmount();

  const smallBlind = board.getParticipant('small');
  assert.equal(smallBlind.nChips, 0);
  assert.equal(smallBlind.isAllInLock, true);
  assert.equal(smallBlind.bPendingAllInStandChoice, true);
  assert.deepEqual(smallBlind.aUserAction, ['c', 's']);
  assert.deepEqual(smallBlind.getAvailableTurnActions(), ['c', 's']);
}

async function staleAllInStandFoldStateIsNormalizedForTurnActions() {
  const board = createFakeBoard([
    participantData({
      iUserId: 'allin',
      nChips: 0,
      isAllInLock: true,
      bPendingAllInStandChoice: true,
      aUserAction: ['s', 'f'],
    }),
    participantData({ iUserId: 'caller', nSeat: 2 }),
  ]);
  const player = board.aParticipant[0];

  assert.deepEqual(player.getAvailableTurnActions(), ['c', 's']);
}

async function reboughtBustedPlayerCanRaiseNextHand() {
  const board = createFakeBoard([
    participantData({
      iUserId: 'rebought',
      nChips: 1000,
      eState: 'bust',
      isAllInLock: true,
      bPendingAllInStandChoice: true,
      aUserAction: ['c', 's'],
      nLastBidChips: 100,
      nTotalBidChips: 100,
      bHasSplit: true,
      bSplitHand1Locked: true,
      bSplitHand2Locked: true,
    }),
    participantData({ iUserId: 'p2', nSeat: 2 }),
  ]);
  const player = board.aParticipant[0];

  player.resetForNextHand();
  player.eState = 'playing';

  assert.equal(player.isAllInLock, false);
  assert.equal(player.bPendingAllInStandChoice, false);
  assert.equal(player.bHasSplit, false);
  assert.deepEqual(player.getAvailableTurnActions(), ['c', 'r', 'f']);
}

const scenarios = [
  ['confirmed all-in raise does not reopen Stand/Fold', confirmedAllInRaiseDoesNotReopenStandFold],
  ['raise is rejected after opponent all-in', raiseIsRejectedAfterOpponentAllIn],
  ['community card reopens all-in Confirm/Stand choice', communityCardReopensAllInConfirmStandChoice],
  ['all-in Confirm choice clears pending state', allInConfirmChoiceClearsPendingState],
  ['bot all-in Stand/Confirm choice auto-confirms', botAllInStandChoiceAutoConfirms],
  ['all-in Stand/Confirm timeout confirms instead of folding', allInStandChoiceTimeoutConfirmsInsteadOfFolding],
  ['all-in Confirm choice waits for live betting to settle', allInConfirmChoiceWaitsForLiveBettingToSettle],
  ['raise from check state reopens call for other players', raiseFromCheckStateReopensCallForOtherPlayers],
  ['all-in blind never receives Stand/Fold choice', allInBlindNeverReceivesStandFoldChoice],
  ['stale all-in Stand/Fold state is normalized for turn actions', staleAllInStandFoldStateIsNormalizedForTurnActions],
  ['rebought busted player can raise next hand', reboughtBustedPlayerCanRaiseNextHand],
];

(async () => {
  let failed = 0;

  for (const [name, run] of scenarios) {
    try {
      await run();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  if (failed > 0) process.exit(1);
  console.log(`\n${scenarios.length} TwentyOneHoldem rule scenarios passed.`);
})();
