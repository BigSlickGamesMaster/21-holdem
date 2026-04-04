import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query';
import _ from 'scripts/helper';
import { ReactToastify } from 'shared/utils';

const FALLBACK_REWARDS = [0, 0, 0, 0, 0, 0, 0];

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

    const aRewards = dataDailyRewards?.rewards?.length ? dataDailyRewards.rewards : FALLBACK_REWARDS;
    const nEligibleDay = Number(dataDailyRewards?.eligibleDay) || 1;
    const bTodayRewardClaimed = Boolean(dataDailyRewards?.bTodayRewardClaimed);
    const nCurrentStreakDay = bTodayRewardClaimed ? (nEligibleDay === 1 ? aRewards.length : nEligibleDay - 1) : nEligibleDay;
    const nClaimedDays = bTodayRewardClaimed ? nCurrentStreakDay : Math.max(nEligibleDay - 1, 0);

    const aRewardDays = useMemo(() => aRewards.map((item, index) => {
        const nDayNumber = index + 1;
        const bCompletedReward = nClaimedDays >= nDayNumber;
        const bClaimableReward = !bTodayRewardClaimed && nEligibleDay === nDayNumber;
        const bCelebrateReward = bPulseEligibleReward && nEligibleDay === nDayNumber;

        return {
            amount: item,
            dayNumber: nDayNumber,
            completed: bCompletedReward,
            claimable: bClaimableReward,
            celebrate: bCelebrateReward,
        };
    }), [aRewards, bPulseEligibleReward, bTodayRewardClaimed, nClaimedDays, nEligibleDay]);

    return (
        <div className={`daily-rewards-page${embedded ? ' daily-rewards-page--embedded' : ''}`}>
            {!embedded ? <div className='daily-rewards-page__backdrop' aria-hidden='true' /> : null}
            {!embedded ? <div className='daily-rewards-page__ambient-grid' aria-hidden='true' /> : null}
            {!embedded ? (
                <div className='daily-rewards-page__atmosphere' aria-hidden='true'>
                    <span className='daily-rewards-page__orb daily-rewards-page__orb--one' />
                    <span className='daily-rewards-page__orb daily-rewards-page__orb--two' />
                    <span className='daily-rewards-page__orb daily-rewards-page__orb--three' />
                    <span className='daily-rewards-page__beam' />
                </div>
            ) : null}

            <div className='daily-rewards-page__shell'>
                <section className='daily-rewards-page__calendar-shell'>
                    <div className='daily-rewards-page__sign-banner'>
                        <span className='daily-rewards-page__sign-side daily-rewards-page__sign-side--left' aria-hidden='true' />
                        <div className='daily-rewards-page__sign-core'>
                            <span className='daily-rewards-page__sign-kicker'>7 Day Bonus</span>
                            <strong className='daily-rewards-page__sign-title'>Daily Rewards</strong>
                            <span className='daily-rewards-page__sign-subtitle'>Collect your chips and keep the streak alive</span>
                        </div>
                        <span className='daily-rewards-page__sign-side daily-rewards-page__sign-side--right' aria-hidden='true' />
                    </div>

                    <header className='daily-rewards-page__calendar-header'>
                        <div className='daily-rewards-page__calendar-actions'>
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

                    <div className='daily-rewards-calendar' aria-label='Daily bonus calendar'>
                        {aRewardDays.map((reward) => (
                            <article
                                key={reward.dayNumber}
                                className={`daily-rewards-calendar__day${reward.completed ? ' is-completed' : ''}${reward.claimable ? ' is-today' : ''}${reward.celebrate ? ' is-celebrating' : ''}`}
                            >
                                <span className='daily-rewards-calendar__label'>Day {reward.dayNumber}</span>
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
