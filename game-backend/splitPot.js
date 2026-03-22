/* 
1. Logic Overview:
Participants: Total 9 participants.
User Actions:
Double Down (DD) locks the player's score and increases risk by 5%.
Stand locks the player's score.
No Action increases risk higher than others.
Community Cards:
3 cards open sequentially, with rounds in between.
Risk Factor:
Each card deal increases risk by 5%.
If the user performs no action, their risk increases more than others.
Winning Amount Distribution:
Based on risk and score.
*/

/**
 * Splits the pot amount between players based on their scores and actions, applying different bonus percentages
 * based on player actions.
 *
 * The pot is distributed in two parts:
 * 1. Bonuses based on player actions:
 *    - No Action players get highest bonus (30% of pot)
 *    - Stand players get tiered bonuses based on timing:
 *      * Stand after 3 cards: 15% of pot
 *      * Stand after 2 cards: 10% of pot
 *      * Stand after 1 card: 5% of pot
 *    - Double Down (DD) players get lowest bonus (3% of pot)
 *
 * 2. Base amount:
 *    - Remaining pot amount after bonuses is split equally among all players
 *
 * Final amount for each player = Base amount + Their applicable bonus
 *
 * @param {Array} players - Array of player objects containing:
 *   - id: Player identifier
 *   - action: Player action ('DD', 'STAND', or 'NONE')
 *   - standTiming: For STAND actions, number of cards after which player stood
 * @param {number} potAmount - Total amount in the pot to be split
 * @returns {Object} Object containing:
 *   - DD_Players: Array of {id, amount} for DD players
 *   - Stand_Players: Array of {id, amount} for stand players
 *   - No_Action_Players: Array of {id, amount} for no action players
 *   - Pot_Amount: Total pot amount
 */

function splitPot(players, potAmount) {
  let ddPlayers = [];
  let standPlayers = [];
  let noActionPlayers = [];

  // Categorize players
  players.forEach(player => {
    if (player.action === 'DD') {
      ddPlayers.push(player);
    } else if (player.action === 'STAND') {
      standPlayers.push(player);
    } else {
      noActionPlayers.push(player);
    }
  });

  let totalBonusAmount = 0;

  // 1. No Action Players (15% split among all no action players)
  let noActionBonusPerPlayer = noActionPlayers.length > 0 ? (0.15 * potAmount) / noActionPlayers.length : 0;
  let noActionBonuses = noActionPlayers.map(() => {
    totalBonusAmount += noActionBonusPerPlayer;
    return noActionBonusPerPlayer;
  });

  // 2. Stand Players (bonus split among players with same timing)
  let standBonuses = standPlayers.map(player => {
    let bonusPercent = 0;
    if (player.standTiming === 2) bonusPercent = 0.1; // 10%
    else if (player.standTiming === 1) bonusPercent = 0.05; // 5%

    // Count players with same timing to split the bonus
    const sameTimingCount = standPlayers.filter(p => p.standTiming === player.standTiming).length;
    const bonus = (bonusPercent * potAmount) / sameTimingCount;
    totalBonusAmount += bonus;
    return bonus;
  });

  // // 3. DD Players (5% split among all DD players)
  // let ddBonusPerPlayer = ddPlayers.length > 0 ? (0.05 * potAmount) / ddPlayers.length : 0;
  // totalBonusAmount += ddBonusPerPlayer * ddPlayers.length;

  // 3. DD Players (0% split among all DD players)
  let ddBonusPerPlayer = 0; // No bonus for DD players
  totalBonusAmount += ddBonusPerPlayer * ddPlayers.length;

  // Calculate remaining amount to be distributed equally
  const remainingAmount = Math.max(0, potAmount - totalBonusAmount);
  const totalPlayers = players.length;
  const baseAmount = remainingAmount / totalPlayers;

  // Calculate final amounts
  let results = {
    DD_Players: ddPlayers.map(player => ({
      id: player.id,
      amount: baseAmount + ddBonusPerPlayer,
    })),
    Stand_Players: standPlayers.map((player, index) => ({
      id: player.id,
      amount: baseAmount + standBonuses[index],
    })),
    No_Action_Players: noActionPlayers.map((player, index) => ({
      id: player.id,
      amount: baseAmount + noActionBonuses[index],
    })),
    Pot_Amount: potAmount,
  };

  return results;
}

// Update verification function to handle DD_Players array
function verifyPotDistribution(splitResult, potAmount) {
  let totalDistributed = splitResult.DD_Players.reduce((sum, p) => sum + p.amount, 0);
  totalDistributed += splitResult.Stand_Players.reduce((sum, p) => sum + p.amount, 0);
  totalDistributed += splitResult.No_Action_Players.reduce((sum, p) => sum + p.amount, 0);

  console.log('\nDetailed Distribution Breakdown (Highest to Lowest Bonus):');

  // 1. No Action Players (15%)
  splitResult.No_Action_Players.forEach(player => {
    const bonus = (0.15 * potAmount) / splitResult.No_Action_Players.length;
    console.log(`No Action: ${player.amount.toFixed(2)} (includes ${bonus.toFixed(2)} bonus (15% of pot))`);
  });

  // 2. Stand Players (10%, 5%)
  const sortedStandPlayers = [...splitResult.Stand_Players].sort((a, b) => {
    const timingA = a.standTiming;
    const timingB = b.standTiming;
    return timingA - timingB;
  });

  sortedStandPlayers.forEach(player => {
    const standTiming = player.standTiming;
    const bonusPercent = standTiming === 2 ? 10 : 5;

    // Count players with same timing to split the bonus
    const sameTimingCount = splitResult.Stand_Players.filter(p => {
      return p.standTiming === standTiming;
    }).length;

    const bonus = ((bonusPercent / 100) * potAmount) / sameTimingCount;
    console.log(`Stand Timing ${standTiming}: ${player.amount.toFixed(2)} (includes ${bonus.toFixed(2)} bonus (${bonusPercent}% of pot))`);
  });

  // 3. DD Players (0%)
  splitResult.DD_Players.forEach(player => {
    // const bonus = (0.05 * potAmount) / splitResult.DD_Players.length;
    const bonus = 0;
    console.log(`DD: ${player.amount.toFixed(2)} (includes ${bonus.toFixed(2)} bonus (0% of pot))`);
  });

  console.log('\nVerification:');
  console.log('Pot Amount:', potAmount);
  console.log('Total Distributed:', totalDistributed.toFixed(2));
  console.log('Amounts Match:', Math.abs(totalDistributed - potAmount) < 0.01);

  return Math.abs(totalDistributed - potAmount) < 0.01;
}

// Test scenarios
const testScenarios = () => {
  console.log('Test Scenario 1: All types of actions');
  const result1 = splitPot(
    [
      { id: 'No_Action', action: 'NONE' },
      { id: 'DD_Player', action: 'DD' },
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
    ],
    1000
  );
  console.log(result1);
  verifyPotDistribution(result1, 1000);

  console.log('\nTest Scenario 2: DD vs No Action');
  const result2 = splitPot(
    [
      { id: 'DD_Player', action: 'DD' },
      { id: 'No_Action', action: 'NONE' },
    ],
    1000
  );
  console.log(result2);
  verifyPotDistribution(result2, 1000);

  console.log('\nTest Scenario 3: All Stand timings');
  const result3 = splitPot(
    [
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
    ],
    1000
  );
  console.log(result3);
  verifyPotDistribution(result3, 1000);

  console.log('\nTest Scenario 4: No action vs Stand after 3 cards');
  const result4 = splitPot(
    [
      { id: 'No_Action', action: 'NONE' },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
    ],
    1000
  );
  console.log(result4);
  verifyPotDistribution(result4, 1000);

  console.log('\nTest Scenario 5: All players score is same');
  const result5 = splitPot(
    [
      { id: 'DD_Player', action: 'DD' },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
    ],
    1000
  );
  console.log(result5);
  verifyPotDistribution(result5, 1000);

  console.log('\nTest Scenario 6: All players score is same');
  const result6 = splitPot(
    [
      { id: 'No_Action', action: 'NONE' },
      { id: 'DD_Player', action: 'DD' },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
      { id: 'DD_Player', action: 'DD' },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
    ],
    1000
  );
  console.log(result6);
  verifyPotDistribution(result6, 1000);

  console.log('\nTest Scenario 7: All players score is same');

  const result7 = splitPot(
    [
      { id: 'No_Action', action: 'NONE' },
      { id: 'No_Action', action: 'NONE' },
      { id: 'DD_Player', action: 'DD' },
      { id: 'DD_Player', action: 'DD' },
      { id: 'DD_Player', action: 'DD' },
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
      { id: 'Stand_2', action: 'STAND', standTiming: 2 },
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
    ],
    1000
  );
  console.log(result7);
  verifyPotDistribution(result7, 1000);

  console.log('\nTest Scenario 8: All players score is same');
  const result8 = splitPot(
    [
      { id: 'DD_Player', action: 'DD' },
      { id: 'Stand_1', action: 'STAND', standTiming: 1 },
    ],
    100
  );
  console.log(result8);
  verifyPotDistribution(result8, 100);
};

testScenarios();
