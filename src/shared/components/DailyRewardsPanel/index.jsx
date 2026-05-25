import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query';
import _ from 'scripts/helper';
import { ReactToastify } from 'shared/utils';

const FALLBACK_REWARDS = [100, 200, 300, 400, 500, 750, 1000];
const FALLBACK_BOARD_DAYS = 28;

function formatAmount(amount) {
    return _.formatCurrencyWithComa(Number(amount) || 0);
}

function getRewardStateLabel(reward) {
    if (reward.completed) return 'Claimed!';
    return '';
}

function formatCountdown(nMilliseconds = 0) {
    const nTotalSeconds = Math.max(0, Math.floor(Number(nMilliseconds) / 1000));
    const nHours = Math.floor(nTotalSeconds / 3600);
    const nMinutes = Math.floor((nTotalSeconds % 3600) / 60);
    const nSeconds = nTotalSeconds % 60;

    return [nHours, nMinutes, nSeconds]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
}

function DailyRewardsPanel({ embedded }) {
    const queryClient = useQueryClient();
    const [bPulseEligibleReward, setPulseEligibleReward] = useState(false);
    const [nNow, setNow] = useState(Date.now());

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

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const { mutate: mutateDailyRewardsClaimed, isLoading: isClaimingReward } = useMutation(updateDailyRewards, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                const payload = response?.data?.data;
                const sBonusMessage = payload?.bonus?.type === 'shop_bogo' || payload?.bonus?.type === 'streak_shield'
                    ? `${payload?.bonus?.label || 'Bonus'} unlocked. You collected ${formatAmount(payload.reward)} chips.`
                    : `${payload?.bonus?.label || 'Bonus'}! You collected ${formatAmount(payload.reward)} chips.`;
                ReactToastify(payload?.bBonusWon ? sBonusMessage : response?.data?.message, 'success');
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

    const aConfiguredRewards = Array.isArray(dataDailyRewards?.rewards) && dataDailyRewards.rewards.length
        ? dataDailyRewards.rewards
        : FALLBACK_REWARDS;
    const nTotalRewardDays = Math.max(Number(dataDailyRewards?.nBoardDays) || FALLBACK_BOARD_DAYS, FALLBACK_BOARD_DAYS);
    const nEligibleDay = Math.max(1, Math.min(Number(dataDailyRewards?.eligibleDay) || 1, nTotalRewardDays));
    const bTodayRewardClaimed = Boolean(dataDailyRewards?.bTodayRewardClaimed);
    const nCurrentStreakDay = bTodayRewardClaimed ? (nEligibleDay === 1 ? nTotalRewardDays : nEligibleDay - 1) : nEligibleDay;
    const nClaimedDays = bTodayRewardClaimed ? nCurrentStreakDay : Math.max(nEligibleDay - 1, 0);
    const dClaimWindowEndsAt = dataDailyRewards?.dClaimWindowEndsAt ? new Date(dataDailyRewards.dClaimWindowEndsAt) : null;
    const dNextClaimAt = dataDailyRewards?.dNextClaimAt ? new Date(dataDailyRewards.dNextClaimAt) : null;
    const aDailyBonuses = useMemo(
        () => (Array.isArray(dataDailyRewards?.aDailyBonuses) ? dataDailyRewards.aDailyBonuses : []),
        [dataDailyRewards?.aDailyBonuses]
    );
    const nCountdownTarget = bTodayRewardClaimed ? dNextClaimAt?.getTime?.() : dClaimWindowEndsAt?.getTime?.();
    const sCountdownLabel = bTodayRewardClaimed ? 'Next reward unlocks in' : 'Streak resets in';
    const sCountdownValue = Number.isFinite(nCountdownTarget) ? formatCountdown(nCountdownTarget - nNow) : '--:--:--';

    const aRewardDays = useMemo(() => Array.from({ length: nTotalRewardDays }, (_, index) => {
        const nDay = index + 1;
        const baseAmount = Number(aConfiguredRewards[index % aConfiguredRewards.length]) || 0;
        const bonus = aDailyBonuses.find((item) => Number(item.day) === nDay) || null;
        const amount = bonus?.type === 'chips'
            ? baseAmount + (Number(bonus.amount) || 0)
            : bonus?.type === 'multiplier'
                ? Math.round(baseAmount * Math.max(Number(bonus.multiplier) || 1, 1))
                : baseAmount;
        const reward = {
            amount,
            baseAmount,
            bonus,
            absoluteDay: nDay,
            dayNumber: nDay,
        };
        const bCompletedReward = nClaimedDays >= reward.absoluteDay;
        const bClaimableReward = !bTodayRewardClaimed && nEligibleDay === reward.absoluteDay;
        const bCelebrateReward = bPulseEligibleReward && nEligibleDay === reward.absoluteDay;

        return {
            ...reward,
            celebrate: bCelebrateReward,
            claimable: bClaimableReward,
            completed: bCompletedReward,
        };
    }), [aConfiguredRewards, aDailyBonuses, bPulseEligibleReward, bTodayRewardClaimed, nClaimedDays, nEligibleDay, nTotalRewardDays]);

    const oStatusReward = aRewardDays.find((reward) => reward.absoluteDay === (bTodayRewardClaimed ? nCurrentStreakDay : nEligibleDay)) || aRewardDays[0];
    const sStatusMessage = bTodayRewardClaimed
        ? 'Come back tomorrow to continue the streak.'
        : 'Claim before the timer ends or the streak resets.';
    const handleClaimReward = () => {
        if (bTodayRewardClaimed || isClaimingReward || isDailyRewardsLoading) return;
        mutateDailyRewardsClaimed();
    };

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
                                <div className={`daily-rewards-page__countdown${bTodayRewardClaimed ? ' is-claimed' : ''}`}>
                                    <span>{sCountdownLabel}</span>
                                    <strong>{sCountdownValue}</strong>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className='daily-rewards-calendar-board' aria-label='Daily rewards list'>
                        {aRewardDays.map((reward) => (
                            <article
                                key={reward.absoluteDay}
                                className={`daily-rewards-calendar__day${reward.completed ? ' is-completed' : ''}${reward.claimable ? ' is-today' : ''}${reward.celebrate ? ' is-celebrating' : ''}${reward.bonus ? ` is-bonus is-bonus-${reward.bonus.type} is-bonus-${reward.bonus.id}` : ''}`}
                                role={reward.claimable ? 'button' : undefined}
                                tabIndex={reward.claimable ? 0 : undefined}
                                onClick={reward.claimable ? handleClaimReward : undefined}
                                onKeyDown={(event) => {
                                    if (!reward.claimable) return;
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleClaimReward();
                                    }
                                }}
                            >
                                <span className='daily-rewards-calendar__label'>Day {reward.absoluteDay}</span>
                                <strong className='daily-rewards-calendar__amount'>{formatAmount(reward.amount)}</strong>
                                {reward.bonus ? <span className='daily-rewards-calendar__bonus'>{reward.bonus.label}</span> : null}
                                <span className='daily-rewards-calendar__state'>{getRewardStateLabel(reward)}</span>
                                {reward.claimable ? (
                                    <button
                                        type='button'
                                        className='daily-rewards-calendar__claim'
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleClaimReward();
                                        }}
                                        disabled={isClaimingReward || isDailyRewardsLoading}
                                    >
                                        {isDailyRewardsLoading ? 'Loading' : isClaimingReward ? 'Claiming' : 'Claim'}
                                    </button>
                                ) : null}
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
