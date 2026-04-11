import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query';
import _ from 'scripts/helper';
import { ReactToastify } from 'shared/utils';

const WEEKLY_BASE_REWARDS = [100, 200, 300, 400, 500, 600];
const WEEKLY_JACKPOTS = [1000, 2000, 3000, 5000];

const REWARD_WEEKS = WEEKLY_JACKPOTS.map((nJackpot, nWeekIndex) => ({
    weekNumber: nWeekIndex + 1,
    days: [...WEEKLY_BASE_REWARDS, nJackpot].map((amount, nDayIndex) => ({
        amount,
        absoluteDay: (nWeekIndex * 7) + nDayIndex + 1,
        dayNumber: nDayIndex + 1,
        isJackpot: nDayIndex === 6,
        weekNumber: nWeekIndex + 1,
    })),
}));

const REWARD_DAYS = REWARD_WEEKS.flatMap((week) => week.days);

const TOTAL_REWARD_DAYS = REWARD_WEEKS.length * 7;

function formatAmount(amount) {
    return _.formatCurrencyWithComa(Number(amount) || 0);
}

function getRewardStateLabel(reward) {
    if (reward.completed) return 'Collected';
    if (reward.claimable) return 'Today';
    return '';
}

function DailyRewardsPanel({ embedded }) {
    const queryClient = useQueryClient();
    const [bPulseEligibleReward, setPulseEligibleReward] = useState(false);

    const { data: dataDailyRewards, isLoading: isDailyRewardsLoading } = useQuery('getDailyRewards', getDailyRewards, {
        select: (data) => data?.data?.data || null,
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message || 'Unable to load daily rewards', 'error');
        },
    });

    useEffect(() => {
        if (!bPulseEligibleReward) return undefined;

        const timer = window.setTimeout(() => {
            setPulseEligibleReward(false);
        }, 2600);

        return () => window.clearTimeout(timer);
    }, [bPulseEligibleReward]);

    const { mutate: mutateDailyRewardsClaimed, isLoading: isClaimingReward } = useMutation(updateDailyRewards, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                ReactToastify(response?.data?.message, 'success');
                queryClient.invalidateQueries('profileData');
                queryClient.invalidateQueries('getDailyRewards');
                setPulseEligibleReward(true);
                return;
            }

            ReactToastify(response?.data?.message || 'Unable to claim reward', 'error');
        },
        onError: (error) => {
            console.log(error);
            queryClient.invalidateQueries('getDailyRewards');
            ReactToastify(error?.response?.data?.message || 'Unable to claim reward', 'error');
        },
    });

    const nEligibleDay = Math.max(1, Math.min(Number(dataDailyRewards?.eligibleDay) || 1, TOTAL_REWARD_DAYS));
    const bTodayRewardClaimed = Boolean(dataDailyRewards?.bTodayRewardClaimed);
    const nCurrentStreakDay = bTodayRewardClaimed ? (nEligibleDay === 1 ? TOTAL_REWARD_DAYS : nEligibleDay - 1) : nEligibleDay;
    const nClaimedDays = bTodayRewardClaimed ? nCurrentStreakDay : Math.max(nEligibleDay - 1, 0);

    const aRewardDays = useMemo(() => REWARD_DAYS.map((reward) => {
        const bCompletedReward = nClaimedDays >= reward.absoluteDay;
        const bClaimableReward = !bTodayRewardClaimed && nEligibleDay === reward.absoluteDay;
        const bCelebrateReward = bPulseEligibleReward && nEligibleDay === reward.absoluteDay;

        return {
            ...reward,
            celebrate: bCelebrateReward,
            claimable: bClaimableReward,
            completed: bCompletedReward,
        };
    }), [bPulseEligibleReward, bTodayRewardClaimed, nClaimedDays, nEligibleDay]);

    const oStatusReward = aRewardDays.find((reward) => reward.absoluteDay === (bTodayRewardClaimed ? nCurrentStreakDay : nEligibleDay)) || aRewardDays[0];
    const sStatusMessage = bTodayRewardClaimed
        ? 'Claimed! Come back tomorrow and keep the streak alive!'
        : 'Claim it now and keep the streak alive!';

    return (
        <div className={`daily-rewards-page${embedded ? ' daily-rewards-page--embedded' : ''}`}>
            {!embedded ? <div className='daily-rewards-page__backdrop' aria-hidden='true' /> : null}
            {!embedded ? <div className='daily-rewards-page__ambient-grid' aria-hidden='true' /> : null}

            <div className='daily-rewards-page__shell'>
                <section className='daily-rewards-page__calendar-shell'>
                    <header className='daily-rewards-page__calendar-header'>
                        <div className='daily-rewards-page__calendar-actions'>
                            <div className='daily-rewards-page__calendar-status'>
                                <strong className='daily-rewards-page__calendar-status-amount'>{formatAmount(oStatusReward?.amount)}</strong>
                                <p className='daily-rewards-page__calendar-status-message'>{sStatusMessage}</p>
                            </div>
                            <button
                                type='button'
                                className={`daily-rewards-page__claim ${bTodayRewardClaimed ? 'is-disabled' : ''}`}
                                onClick={() => {
                                    if (!bTodayRewardClaimed && !isDailyRewardsLoading) {
                                        mutateDailyRewardsClaimed();
                                    }
                                }}
                                disabled={bTodayRewardClaimed || isClaimingReward || isDailyRewardsLoading}
                            >
                                {isDailyRewardsLoading ? 'Loading...' : isClaimingReward ? 'Collecting...' : bTodayRewardClaimed ? 'Collected Today' : 'Claim Today'}
                            </button>
                        </div>
                    </header>

                    <div className='daily-rewards-calendar-board' aria-label='Daily rewards list'>
                        {aRewardDays.map((reward) => (
                            <article
                                key={reward.absoluteDay}
                                className={`daily-rewards-calendar__day${reward.completed ? ' is-completed' : ''}${reward.claimable ? ' is-today' : ''}${reward.celebrate ? ' is-celebrating' : ''}${reward.isJackpot ? ' is-jackpot' : ''}`}
                            >
                                <span className='daily-rewards-calendar__label'>Day {reward.absoluteDay}</span>
                                <strong className='daily-rewards-calendar__amount'>{formatAmount(reward.amount)}</strong>
                                <span className='daily-rewards-calendar__state'>{getRewardStateLabel(reward)}</span>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

DailyRewardsPanel.propTypes = {
    embedded: PropTypes.bool,
};

DailyRewardsPanel.defaultProps = {
    embedded: false,
};

export default DailyRewardsPanel;
