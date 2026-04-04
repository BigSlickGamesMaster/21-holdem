import { faDoorOpen, faGift, faShieldHalved, faTableCellsLarge, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query';
import { getTables, joinTable } from 'query/gameTable.query';
import { getProfile } from 'query/profile.query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import _ from 'scripts/helper';
import DailyRewardsPanel from 'shared/components/DailyRewardsPanel';
import { BUILT_IN_AVATARS, DEFAULT_PROFILE_BANNER, getAvatarImageSrc } from 'shared/constants/builtInAvatars';
import { getCookie, ReactToastify, removeCookie } from 'shared/utils';
import dailyRewardsBanner from '../../assets/images/daily-rewards/daily-rewards-base.png';
import guestWelcomeImage from '../../assets/images/bg/master_welcome.png';
import liveTablesImage from '../../assets/images/bg/live_tables.png';
import privateTableImage from '../../assets/images/bg/private_table.png';
import portraitTableImage from '../../assets/images/gameplay/portrate_table.png';

function formatAmount(amount) {
    return _.formatCurrencyWithComa(Number(amount) || 0);
}

function getBlindLabel(nMinBet) {
    const nSmallBlind = Number(nMinBet) || 0;
    const nBigBlind = nSmallBlind * 2;
    return `${formatAmount(nSmallBlind)} / ${formatAmount(nBigBlind)}`;
}

function getActivePlayers(table) {
    return Number(table?.nLiveParticipants) || Number(table?.nActivePlayers) || 0;
}

function getAvailableTableCount(table) {
    return Math.max(Number(table?.nLiveTableCount) || 0, 1);
}

function sortTablesByPriority(a, b) {
    const nLiveTableDiff = Number(b?.nLiveTableCount || 0) - Number(a?.nLiveTableCount || 0);
    if (nLiveTableDiff !== 0) return nLiveTableDiff;

    const nPlayerDiff = getActivePlayers(b) - getActivePlayers(a);
    if (nPlayerDiff !== 0) return nPlayerDiff;

    const nBuyInDiff = Number(a?.nMinBuyIn || 0) - Number(b?.nMinBuyIn || 0);
    if (nBuyInDiff !== 0) return nBuyInDiff;

    return String(a?.sName || '').localeCompare(String(b?.sName || ''));
}

const PLAYER_OPTIONS = [4, 6, 9];
const BUY_IN_OPTIONS = [1000, 5000, 15000, 20000];
const LOBBY_TAB_IDS = ['lobby-live-tables', 'lobby-missions', 'lobby-private-table', 'lobby-player-profile'];
const LOBBY_WELCOME_STORAGE_PREFIX = 'bsg-lobby-welcome-dismissed';

function hashSeed(seed = '') {
    return String(seed || '21-holdem')
        .split('')
        .reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 2147483647, 11);
}

function getLobbyWelcomeStorageKey(profileData) {
    const sIdentity = profileData?._id || profileData?.sUserName || '';
    return sIdentity ? `${LOBBY_WELCOME_STORAGE_PREFIX}:${sIdentity}` : '';
}

function getTableSeatAvatars(table) {
    const nSeatCount = Math.max(0, Number(table?.nMaxPlayer) || 0);
    if (!nSeatCount || !BUILT_IN_AVATARS.length) return [];

    const nStartIndex = Math.abs(hashSeed(`${table?._id || table?.sName || table?.nMaxPlayer || 'table'}`)) % BUILT_IN_AVATARS.length;

    return Array.from({ length: nSeatCount }, (_, index) => (
        BUILT_IN_AVATARS[(nStartIndex + index) % BUILT_IN_AVATARS.length]?.sPath || DEFAULT_PROFILE_BANNER
    ));
}

function getDefaultSeatCount(tables) {
    return PLAYER_OPTIONS.find(nSeatCount =>
        (tables || []).some(table => Number(table.nMaxPlayer) === nSeatCount)
    ) || PLAYER_OPTIONS[0];
}

function getDefaultBuyIn(tables, nSeatCount) {
    return BUY_IN_OPTIONS.find(nBuyIn =>
        (tables || []).some(
            table => Number(table.nMaxPlayer) === nSeatCount && Number(table.nMinBuyIn) === nBuyIn
        )
    ) || BUY_IN_OPTIONS[0];
}

const Dashboard = () => {
    const dashboardRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [sActiveTab, setActiveTab] = useState('lobby-live-tables');
    const [nActiveSeatCount, setActiveSeatCount] = useState(PLAYER_OPTIONS[0]);
    const [nActiveBuyIn, setActiveBuyIn] = useState(BUY_IN_OPTIONS[0]);
    const [bHasAdjustedFilters, setHasAdjustedFilters] = useState(false);
    const [bShowWelcomeModal, setShowWelcomeModal] = useState(false);
    const [bDontShowWelcomeAgain, setDontShowWelcomeAgain] = useState(false);

    const { data: tablesData = [], isLoading: isDataTableLoading } = useQuery('getTables', getTables, {
        select: (data) => data?.data?.data || [],
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message || 'Unable to load tables', 'error');
        },
    });

    const { data: profileData } = useQuery('profileData', getProfile, {
        select: (data) => data?.data?.data || null,
        onError: (error) => {
            console.log(error);
        },
    });

    const { data: dataDailyRewards } = useQuery('getDailyRewards', getDailyRewards, {
        select: (data) => data?.data?.data || null,
        onError: (error) => {
            console.log(error);
        },
    });

    const { mutate: joinTableMutate, isLoading: joinTableLoading } = useMutation(joinTable, {
        onSuccess: (data) => {
            if (data.status === 200) {
                navigate('/game', { state: { sAuthToken: getCookie('sAuthToken'), iBoardId: data.data.data.iBoardId } });
            }
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message || 'Unable to join table', 'error');
            queryClient.invalidateQueries('getTables');
        },
    });

    const { mutate: mutateDailyRewardsClaimed, isLoading: isClaimingReward } = useMutation(updateDailyRewards, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                ReactToastify(response?.data?.message, 'success');
                queryClient.invalidateQueries('profileData');
                queryClient.invalidateQueries('getDailyRewards');
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

    const aSortedTables = useMemo(() => [...tablesData].sort(sortTablesByPriority), [tablesData]);
    const nLobbyTableTotal = useMemo(() => tablesData.reduce((nTotal, table) => nTotal + (Number(table.nLiveTableCount) || 0), 0), [tablesData]);

    useEffect(() => {
        if (bHasAdjustedFilters || !aSortedTables.length) return;

        const nDefaultSeatCount = getDefaultSeatCount(aSortedTables);
        const nDefaultBuyIn = getDefaultBuyIn(aSortedTables, nDefaultSeatCount);

        setActiveSeatCount(nDefaultSeatCount);
        setActiveBuyIn(nDefaultBuyIn);
    }, [aSortedTables, bHasAdjustedFilters]);

    useEffect(() => {
        const sRequestedTab = new URLSearchParams(location.search).get('tab');
        if (LOBBY_TAB_IDS.includes(sRequestedTab)) {
            setActiveTab(sRequestedTab);
        }
    }, [location.search]);

    useEffect(() => {
        const dashboardNode = dashboardRef.current;
        if (!dashboardNode || typeof window === 'undefined') return undefined;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

        let nFrame = 0;
        let fnDetachOrientationListener = null;

        const applyTilt = (nX, nY, nRotate = 0) => {
            const nShiftX = Math.max(-12, Math.min(12, Number(nX) || 0));
            const nShiftY = Math.max(-12, Math.min(12, Number(nY) || 0));
            const nGlowX = Math.max(18, Math.min(82, 50 + (nShiftX * 2.4)));
            const nGlowY = Math.max(18, Math.min(82, 50 + (nShiftY * 3.1)));

            if (nFrame) window.cancelAnimationFrame(nFrame);
            nFrame = window.requestAnimationFrame(() => {
                dashboardNode.style.setProperty('--dashboard-tilt-shift-x', `${nShiftX.toFixed(2)}px`);
                dashboardNode.style.setProperty('--dashboard-tilt-shift-y', `${nShiftY.toFixed(2)}px`);
                dashboardNode.style.setProperty('--dashboard-tilt-glow-x', `${nGlowX.toFixed(1)}%`);
                dashboardNode.style.setProperty('--dashboard-tilt-glow-y', `${nGlowY.toFixed(1)}%`);
                dashboardNode.style.setProperty('--dashboard-tilt-rotate', `${nRotate.toFixed(2)}deg`);
            });
        };

        const resetTilt = () => applyTilt(0, 0, 0);

        const handlePointerMove = (event) => {
            const oRect = dashboardNode.getBoundingClientRect();
            if (!oRect.width || !oRect.height) return;

            const nRelativeX = ((event.clientX - oRect.left) / oRect.width) - 0.5;
            const nRelativeY = ((event.clientY - oRect.top) / oRect.height) - 0.5;

            applyTilt(nRelativeX * 14, nRelativeY * 12, nRelativeX * 18);
        };

        const handlePointerLeave = () => resetTilt();

        const startOrientationListener = () => {
            if (fnDetachOrientationListener) return;

            const handleDeviceOrientation = (event) => {
                if (typeof event.gamma !== 'number' && typeof event.beta !== 'number') return;

                const nGamma = Math.max(-18, Math.min(18, Number(event.gamma) || 0));
                const nBeta = Math.max(-18, Math.min(18, Number(event.beta) || 0));

                applyTilt(nGamma * 0.65, nBeta * 0.45, nGamma * 1.2);
            };

            window.addEventListener('deviceorientation', handleDeviceOrientation, true);
            fnDetachOrientationListener = () => window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
        };

        const handleMotionUnlock = async () => {
            const oDeviceOrientation = window.DeviceOrientationEvent;
            if (!oDeviceOrientation || typeof oDeviceOrientation.requestPermission !== 'function') return;

            try {
                const sPermission = await oDeviceOrientation.requestPermission();
                if (sPermission === 'granted') {
                    startOrientationListener();
                }
            } catch (error) {
                console.log(error);
            }
        };

        const oDeviceOrientation = window.DeviceOrientationEvent;
        if (oDeviceOrientation && typeof oDeviceOrientation.requestPermission === 'function') {
            dashboardNode.addEventListener('pointerdown', handleMotionUnlock, { passive: true, once: true });
        } else if (oDeviceOrientation) {
            startOrientationListener();
        }

        dashboardNode.addEventListener('pointermove', handlePointerMove);
        dashboardNode.addEventListener('pointerleave', handlePointerLeave);
        resetTilt();

        return () => {
            dashboardNode.removeEventListener('pointermove', handlePointerMove);
            dashboardNode.removeEventListener('pointerleave', handlePointerLeave);
            dashboardNode.removeEventListener('pointerdown', handleMotionUnlock);
            if (fnDetachOrientationListener) fnDetachOrientationListener();
            if (nFrame) window.cancelAnimationFrame(nFrame);
        };
    }, []);

    const sWelcomeStorageKey = useMemo(() => getLobbyWelcomeStorageKey(profileData), [profileData]);

    useEffect(() => {
        if (!sWelcomeStorageKey || typeof window === 'undefined') return;

        const bDismissed = window.localStorage.getItem(sWelcomeStorageKey) === 'true';
        setDontShowWelcomeAgain(bDismissed);
        setShowWelcomeModal(!bDismissed);
    }, [sWelcomeStorageKey]);

    const aFilteredTables = useMemo(() => (
        aSortedTables.filter(table => (
            Number(table.nMaxPlayer) === nActiveSeatCount
            && Number(table.nMinBuyIn) === nActiveBuyIn
        ))
    ), [aSortedTables, nActiveSeatCount, nActiveBuyIn]);

    const nGamesPlayed = Number(profileData?.nGamePlayed) || 0;
    const nGamesWon = Number(profileData?.nGameWon) || 0;
    const nGamesLost = Number(profileData?.nGameLost) || 0;
    const nWinRate = nGamesPlayed ? Math.round((nGamesWon / nGamesPlayed) * 100) : 0;
    const nLossRate = nGamesPlayed ? Math.round((nGamesLost / nGamesPlayed) * 100) : 0;
    const sDisplayName = profileData?.sUserName || 'Player';
    const sAvatarSrc = getAvatarImageSrc(profileData?.sAvatar, profileData?.sUserName);
    const aRewards = dataDailyRewards?.rewards?.length ? dataDailyRewards.rewards : [1000, 2500, 5000, 7500, 10000, 12500, 15000];
    const nEligibleDay = Number(dataDailyRewards?.eligibleDay) || 1;
    const bTodayRewardClaimed = Boolean(dataDailyRewards?.bTodayRewardClaimed);

    const oProfileStageStyle = useMemo(() => ({ '--profile-stage-image': `url("${sAvatarSrc || DEFAULT_PROFILE_BANNER}")` }), [sAvatarSrc]);

    const aQuickNavItems = useMemo(() => ([
        { id: 'lobby-live-tables', label: 'Live Tables', hint: 'See the busiest rooms and sit fast.', icon: faTableCellsLarge, style: { '--quick-link-image': `url("${liveTablesImage}")` } },
        { id: 'lobby-missions', label: 'Missions & Rewards', hint: 'Collect streak bonuses and rewards.', icon: faGift, style: { '--quick-link-image': `url("${dailyRewardsBanner}")` } },
        { id: 'lobby-private-table', label: 'Private Table', hint: 'Open a room for your own players.', icon: faShieldHalved, style: { '--quick-link-image': `url("${privateTableImage}")` } },
        { id: 'lobby-player-profile', label: 'Player Profile', hint: 'Check balance, record, and stats.', icon: faUser, style: { '--quick-link-image': `url("${sAvatarSrc || DEFAULT_PROFILE_BANNER}")` } },
    ]), [sAvatarSrc]);

    const aUtilityPills = [
        { id: 'balance', label: 'Chips', value: formatAmount(profileData?.nChips), target: 'lobby-player-profile' },
        { id: 'tables', label: 'Tables', value: String(nLobbyTableTotal || tablesData.length || 0), target: 'lobby-live-tables' },
        { id: 'rate', label: 'Win Rate', value: `${nWinRate}%`, target: 'lobby-player-profile' },
    ];

    const handleLogout = () => {
        removeCookie('sAuthToken');
        navigate('/login');
    };

    const handleTabChange = (sTabId) => {
        setActiveTab(sTabId);
    };

    const handleDesktopNavSelect = (sTabId) => {
        setActiveTab(sTabId);
        if (typeof document === 'undefined') return;

        const oPanel = document.getElementById(`${sTabId}-desktop-card`);
        if (oPanel) {
            oPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    };

    const handleSeatCountChange = (nSeatCount) => {
        const nNextSeatCount = Number(nSeatCount) || PLAYER_OPTIONS[0];
        const nNextBuyIn = getDefaultBuyIn(aSortedTables, nNextSeatCount);
        setHasAdjustedFilters(true);
        setActiveSeatCount(nNextSeatCount);
        setActiveBuyIn(nNextBuyIn);
    };

    const handleBuyInChange = (nBuyIn) => {
        setHasAdjustedFilters(true);
        setActiveBuyIn(Number(nBuyIn) || BUY_IN_OPTIONS[0]);
    };

    const handleCloseWelcomeModal = () => {
        if (typeof window !== 'undefined' && sWelcomeStorageKey) {
            if (bDontShowWelcomeAgain) {
                window.localStorage.setItem(sWelcomeStorageKey, 'true');
            } else {
                window.localStorage.removeItem(sWelcomeStorageKey);
            }
        }

        setShowWelcomeModal(false);
    };

    const handleTabKeyDown = (event, sCurrentTabId) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();

        const nCurrentIndex = aQuickNavItems.findIndex((item) => item.id === sCurrentTabId);
        if (nCurrentIndex === -1) return;

        let nNextIndex = nCurrentIndex;

        if (event.key === 'Home') nNextIndex = 0;
        if (event.key === 'End') nNextIndex = aQuickNavItems.length - 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nNextIndex = (nCurrentIndex + 1) % aQuickNavItems.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nNextIndex = (nCurrentIndex - 1 + aQuickNavItems.length) % aQuickNavItems.length;

        const sNextTabId = aQuickNavItems[nNextIndex]?.id;
        if (!sNextTabId) return;

        setActiveTab(sNextTabId);
        if (typeof document !== 'undefined') {
            window.requestAnimationFrame(() => document.getElementById(`${sNextTabId}-tab`)?.focus());
        }
    };

    const renderLiveTablesPanel = () => (
        <>
            <header className='dashboard-hub__window-heading'>
                <h2>Live Tables</h2>
                <div className='dashboard-hub__seat-switch' role='group' aria-label='Choose number of players'>
                    {PLAYER_OPTIONS.map((nSeatOption) => (
                        <button
                            key={nSeatOption}
                            type='button'
                            className={`dashboard-hub__seat-pill${nSeatOption === nActiveSeatCount ? ' is-active' : ''}`}
                            onClick={() => handleSeatCountChange(nSeatOption)}
                        >
                            {nSeatOption}
                        </button>
                    ))}
                </div>
            </header>

            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--live'>
                <div className='dashboard-hub__buyin-grid' role='group' aria-label='Choose buy-in'>
                    {BUY_IN_OPTIONS.map((nBuyInOption) => {
                        const oBuyInTable = aSortedTables.find((table) => (
                            Number(table.nMaxPlayer) === nActiveSeatCount
                            && Number(table.nMinBuyIn) === nBuyInOption
                        ));

                        return (
                            <button
                                key={nBuyInOption}
                                type='button'
                                className={`dashboard-hub__buyin-tile${nBuyInOption === nActiveBuyIn ? ' is-active' : ''}`}
                                onClick={() => handleBuyInChange(nBuyInOption)}
                            >
                                <span className='dashboard-hub__buyin-art' aria-hidden='true'>
                                    <img src={liveTablesImage} alt='' />
                                </span>
                                <span className='dashboard-hub__buyin-copy'>
                                    <strong>{formatAmount(nBuyInOption)}</strong>
                                    <span>{oBuyInTable ? getBlindLabel(oBuyInTable.nMinBet) : 'Waiting'}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {aFilteredTables.length ? (
                    <ul className='dashboard-hub__table-grid' aria-label='Available tables'>
                        {aFilteredTables.map((table) => {
                            const nAvailableTables = getAvailableTableCount(table);
                            const aSeatAvatars = getTableSeatAvatars(table);

                            return (
                                <li key={table._id}>
                                    <button
                                        type='button'
                                        className='dashboard-hub__table-card'
                                        onClick={() => joinTableMutate(table._id)}
                                        disabled={joinTableLoading}
                                        aria-label={`Select ${table.sName}. ${nAvailableTables} available ${nAvailableTables === 1 ? 'table' : 'tables'}. ${table.nMaxPlayer}-player setup.`}
                                    >
                                        <span className='dashboard-hub__table-card-art' aria-hidden='true'>
                                            <img src={portraitTableImage} alt='' />
                                        </span>
                                        <span className='dashboard-hub__table-card-copy'>
                                            <span className='dashboard-hub__table-card-header'>
                                                <strong>{table.sName}</strong>
                                                <span className='dashboard-hub__table-card-availability'>
                                                    {nAvailableTables} {nAvailableTables === 1 ? 'table' : 'tables'}
                                                </span>
                                            </span>
                                            <span className='dashboard-hub__table-card-avatars' aria-hidden='true'>
                                                {aSeatAvatars.map((avatarSrc, index) => (
                                                    <span key={`${table._id}-seat-${index + 1}`} className='dashboard-hub__table-card-avatar'>
                                                        <img src={avatarSrc} alt='' />
                                                    </span>
                                                ))}
                                            </span>
                                            <span className='dashboard-hub__table-card-caption'>{table.nMaxPlayer}-player setup</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                {!aFilteredTables.length ? (
                    <div className='dashboard-hub__empty'>
                        <strong>{isDataTableLoading ? 'Loading tables...' : 'No tables on this buy-in yet'}</strong>
                        <span>Try another buy-in or seat count to find an open table.</span>
                    </div>
                ) : null}
            </div>
        </>
    );

    const renderWelcomeModal = () => (
        <div className='dashboard-hub__welcome-modal-layer' role='dialog' aria-modal='true' aria-labelledby='dashboard-welcome-title'>
            <button type='button' className='dashboard-hub__welcome-modal-backdrop' onClick={handleCloseWelcomeModal} aria-label='Close welcome message' />
            <div className='dashboard-hub__welcome-modal'>
                <button type='button' className='dashboard-hub__welcome-modal-close' onClick={handleCloseWelcomeModal}>
                    Close
                </button>
                <div className='dashboard-hub__welcome-modal-grid'>
                    <div className='dashboard-hub__welcome-modal-visual'>
                        <div className='dashboard-hub__welcome-modal-media dashboard-hub__welcome-modal-media--character'>
                            <img src={guestWelcomeImage} alt='21 Holdem welcome character' />
                        </div>
                        <div className='dashboard-hub__welcome-modal-media-actions'>
                            <button type='button' className='dashboard-hub__cta dashboard-hub__cta--welcome-secondary' onClick={() => navigate('/register')}>
                                Sign Up
                            </button>
                        </div>
                    </div>
                    <div className='dashboard-hub__welcome-modal-copy'>
                        <span className='dashboard-hub__section-kicker'>Welcome</span>
                        <h2 id='dashboard-welcome-title'>Welcome to 21 Hold&apos;em</h2>
                        <p>21 Hold&apos;em blends blackjack scoring with hold&apos;em-style table pressure. Push toward 21 without busting, stand when you like your total, and let the table action build around you.</p>
                        <div className='dashboard-hub__welcome-points'>
                            <article className='dashboard-hub__welcome-point'>
                                <strong>What it is</strong>
                                <span>A faster social casino table game built for short mobile sessions and quick decisions.</span>
                            </article>
                            <article className='dashboard-hub__welcome-point'>
                                <strong>Who it suits</strong>
                                <span>Perfect for blackjack players, poker-curious casino fans, and private-group table nights.</span>
                            </article>
                            <article className='dashboard-hub__welcome-point'>
                                <strong>How to start</strong>
                                <span>Choose your player count, pick a buy-in, then select one of the live tables waiting below.</span>
                            </article>
                        </div>
                        <label className='dashboard-hub__welcome-checkbox'>
                            <input
                                type='checkbox'
                                checked={bDontShowWelcomeAgain}
                                onChange={(event) => setDontShowWelcomeAgain(event.target.checked)}
                            />
                            <span>Don&apos;t show again</span>
                        </label>
                        <div className='dashboard-hub__welcome-actions'>
                            <button type='button' className='dashboard-hub__cta dashboard-hub__cta--welcome' onClick={handleCloseWelcomeModal}>
                                Enter Lobby
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRewardsPanel = () => (
        <>
            <header className='dashboard-hub__window-heading'>
                <h2>Daily Rewards</h2>
            </header>

            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--rewards'>
                <DailyRewardsPanel embedded />
            </div>
        </>
    );

    const renderPrivateTablePanel = () => (
        <>
            <header className='dashboard-hub__tab-header'>
                <div className='dashboard-hub__tab-copy'>
                    <span className='dashboard-hub__section-kicker'>Private room</span>
                    <h2>Host your own room and control exactly who joins.</h2>
                    <p>Private tables give you a cleaner setup for friends, invite-only sessions, and repeat groups without public lobby noise.</p>
                </div>
                <div className='dashboard-hub__tab-side'>
                    <div className='dashboard-hub__pill-row'>
                        <span className='dashboard-hub__pill'>Invite-only access</span>
                        <span className='dashboard-hub__pill'>Fast room setup</span>
                        <span className='dashboard-hub__pill'>Group play ready</span>
                    </div>
                    <button
                        type='button'
                        className='dashboard-hub__cta dashboard-hub__cta--private'
                        onClick={() => navigate('/private-table')}
                    >
                        Create Private Table
                    </button>
                </div>
            </header>

            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--private'>
                <div className='dashboard-hub__tab-grid'>
                    <div className='dashboard-hub__card-media'>
                        <img src={privateTableImage} alt='21 Holdem private table' />
                    </div>

                    <div className='dashboard-hub__tab-stack'>
                        <div className='dashboard-hub__spotlight'>
                            <strong>Host your own room</strong>
                            <span>Create a code, choose the seat count, and bring your group into a private game without public-table traffic.</span>
                        </div>

                        <ul className='dashboard-hub__private-list' aria-label='Private table benefits'>
                            <li className='dashboard-hub__private-item'>
                                <strong>Invite-only access</strong>
                                <span>Only players with your room code can join the table.</span>
                            </li>
                            <li className='dashboard-hub__private-item'>
                                <strong>Fast setup</strong>
                                <span>Open a room in seconds and send the code straight to your group.</span>
                            </li>
                            <li className='dashboard-hub__private-item'>
                                <strong>Controlled atmosphere</strong>
                                <span>Perfect for friends, private events, and repeat home-game style sessions.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className='dashboard-hub__tab-footer'>
                    <span className='dashboard-hub__tab-footnote'>Use private rooms when you want the table atmosphere without the public lobby queue.</span>
                </div>
            </div>
        </>
    );

    const renderProfilePanel = () => (
        <>
            <header className='dashboard-hub__tab-header'>
                <div className='dashboard-hub__tab-copy'>
                    <span className='dashboard-hub__section-kicker'>Player profile</span>
                    <h2>Your balance, results, and shortcuts all live here.</h2>
                    <p>This panel keeps the account essentials in one clean place, so you can check your position without leaving the lobby flow.</p>
                </div>
                <div className='dashboard-hub__pill-row'>
                    <span className='dashboard-hub__pill'>Balance {formatAmount(profileData?.nChips)}</span>
                    <span className='dashboard-hub__pill'>{nGamesWon} wins</span>
                    <span className='dashboard-hub__pill'>{nWinRate}% win rate</span>
                </div>
            </header>

            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--profile'>
                <div className='dashboard-hub__tab-grid dashboard-hub__tab-grid--profile'>
                    <div className='dashboard-hub__profile-stage' style={oProfileStageStyle}>
                        <div className='dashboard-hub__profile-stage-inner'>
                            <div className='dashboard-hub__profile-hero'>
                                <div className='dashboard-hub__profile-avatar'>
                                    <img
                                        src={sAvatarSrc}
                                        alt={profileData?.sUserName || 'Player avatar'}
                                        onError={(event) => {
                                            event.currentTarget.src = getAvatarImageSrc('', profileData?.sUserName);
                                        }}
                                    />
                                </div>

                                <div className='dashboard-hub__profile-heading'>
                                    <span className='dashboard-hub__profile-label'>Signed in as</span>
                                    <div className='dashboard-hub__profile-name'>{_.appendSuffix(sDisplayName, 16)}</div>
                                    <div className='dashboard-hub__profile-balance'>Balance {formatAmount(profileData?.nChips)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='dashboard-hub__tab-stack'>
                        <div className='dashboard-hub__profile-stats-grid'>
                            <div className='dashboard-hub__profile-stat'>
                                <span>Games</span>
                                <strong>{nGamesPlayed}</strong>
                            </div>
                            <div className='dashboard-hub__profile-stat'>
                                <span>Wins</span>
                                <strong>{nGamesWon}</strong>
                            </div>
                            <div className='dashboard-hub__profile-stat'>
                                <span>Win Rate</span>
                                <strong>{nWinRate}%</strong>
                            </div>
                        </div>

                        <div className='dashboard-hub__profile-meter'>
                            <div className='dashboard-hub__profile-meter-label'>
                                <span>Wins</span>
                                <span>{nGamesWon} / {Math.max(nGamesPlayed, 1)}</span>
                            </div>
                            <div className='dashboard-hub__progress'>
                                <div className='dashboard-hub__progress-bar dashboard-hub__progress-bar--gold' style={{ width: `${nWinRate}%` }} />
                            </div>
                        </div>

                        <div className='dashboard-hub__profile-meter'>
                            <div className='dashboard-hub__profile-meter-label'>
                                <span>Losses</span>
                                <span>{nGamesLost} / {Math.max(nGamesPlayed, 1)}</span>
                            </div>
                            <div className='dashboard-hub__progress'>
                                <div className='dashboard-hub__progress-bar dashboard-hub__progress-bar--blue' style={{ width: `${nLossRate}%` }} />
                            </div>
                        </div>

                        <div className='dashboard-hub__profile-actions'>
                            <button type='button' className='dashboard-hub__secondary-cta' onClick={() => navigate('/shop')}>
                                Deposit
                            </button>
                            <button type='button' className='dashboard-hub__secondary-cta dashboard-hub__secondary-cta--accent' onClick={() => navigate('/profile')}>
                                View Stats
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    const renderDesktopLiveCard = () => {
        const oFeaturedTable = aFilteredTables[0] || aSortedTables[0] || null;
        const nAvailableTables = oFeaturedTable ? getAvailableTableCount(oFeaturedTable) : 0;
        const aSeatAvatars = oFeaturedTable ? getTableSeatAvatars(oFeaturedTable) : [];

        return (
            <article
                id='lobby-live-tables-desktop-card'
                className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--live${sActiveTab === 'lobby-live-tables' ? ' is-active' : ''}`}
            >
                <header className='dashboard-hub__desktop-card-header'>
                    <h3>Live Tables</h3>
                </header>

                <div className='dashboard-hub__desktop-card-media'>
                    <img src={liveTablesImage} alt='21 Holdem live tables' />
                </div>

                <div className='dashboard-hub__desktop-card-body dashboard-hub__desktop-card-body--live'>
                    <div className='dashboard-hub__desktop-filter-block'>
                        <span className='dashboard-hub__desktop-filter-label'>Players</span>
                        <div className='dashboard-hub__seat-switch' role='group' aria-label='Choose number of players'>
                            {PLAYER_OPTIONS.map((nSeatOption) => (
                                <button
                                    key={`desktop-seat-${nSeatOption}`}
                                    type='button'
                                    className={`dashboard-hub__seat-pill${nSeatOption === nActiveSeatCount ? ' is-active' : ''}`}
                                    onClick={() => handleSeatCountChange(nSeatOption)}
                                >
                                    {nSeatOption}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='dashboard-hub__desktop-filter-block'>
                        <span className='dashboard-hub__desktop-filter-label'>Buy-In</span>
                        <div className='dashboard-hub__desktop-buyin-grid' role='group' aria-label='Choose buy-in'>
                            {BUY_IN_OPTIONS.map((nBuyInOption) => {
                                const oBuyInTable = aSortedTables.find((table) => (
                                    Number(table.nMaxPlayer) === nActiveSeatCount
                                    && Number(table.nMinBuyIn) === nBuyInOption
                                ));

                                return (
                                    <button
                                        key={`desktop-buyin-${nBuyInOption}`}
                                        type='button'
                                        className={`dashboard-hub__desktop-buyin-chip${nBuyInOption === nActiveBuyIn ? ' is-active' : ''}`}
                                        onClick={() => handleBuyInChange(nBuyInOption)}
                                    >
                                        <strong>{formatAmount(nBuyInOption)}</strong>
                                        <span>{oBuyInTable ? getBlindLabel(oBuyInTable.nMinBet) : 'Waiting'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className='dashboard-hub__desktop-live-summary'>
                        <div className='dashboard-hub__desktop-live-summary-top'>
                            <strong>{oFeaturedTable?.sName || 'Open Table'}</strong>
                            <span>{nAvailableTables} {nAvailableTables === 1 ? 'table' : 'tables'} available</span>
                        </div>
                        <div className='dashboard-hub__desktop-live-summary-bottom'>
                            <span>{oFeaturedTable ? `${oFeaturedTable.nMaxPlayer}-player setup` : `${nActiveSeatCount}-player setup`}</span>
                            <span>{oFeaturedTable ? getBlindLabel(oFeaturedTable.nMinBet) : 'Blind amount waiting'}</span>
                        </div>
                        {aSeatAvatars.length ? (
                            <div className='dashboard-hub__desktop-seat-strip' aria-hidden='true'>
                                {aSeatAvatars.map((avatarSrc, index) => (
                                    <span key={`desktop-live-seat-${index + 1}`} className='dashboard-hub__table-card-avatar'>
                                        <img src={avatarSrc} alt='' />
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className='dashboard-hub__desktop-card-footer'>
                    <button
                        type='button'
                        className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--primary'
                        onClick={() => oFeaturedTable && joinTableMutate(oFeaturedTable._id)}
                        disabled={!oFeaturedTable || joinTableLoading}
                    >
                        {joinTableLoading ? 'Joining...' : 'Join Table'}
                    </button>
                </div>
            </article>
        );
    };

    const renderDesktopRewardsCard = () => (
        <article
            id='lobby-missions-desktop-card'
            className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--rewards${sActiveTab === 'lobby-missions' ? ' is-active' : ''}`}
        >
            <header className='dashboard-hub__desktop-card-header'>
                <h3>Missions & Rewards</h3>
            </header>

            <div className='dashboard-hub__desktop-card-media dashboard-hub__desktop-card-media--rewards'>
                <img src={dailyRewardsBanner} alt='21 Holdem daily rewards' />
            </div>

            <div className='dashboard-hub__desktop-card-body dashboard-hub__desktop-card-body--rewards'>
                <div className='dashboard-hub__desktop-reward-list'>
                    {aRewards.slice(0, 3).map((nRewardAmount, index) => {
                        const nDayNumber = index + 1;
                        const bCollected = bTodayRewardClaimed ? nDayNumber < nEligibleDay : nDayNumber < nEligibleDay;
                        const bToday = !bTodayRewardClaimed && nDayNumber === nEligibleDay;

                        return (
                            <article key={`desktop-reward-${nDayNumber}`} className={`dashboard-hub__desktop-reward-item${bToday ? ' is-current' : ''}${bCollected ? ' is-completed' : ''}`}>
                                <div className='dashboard-hub__desktop-reward-copy'>
                                    <span>Day {nDayNumber}</span>
                                    <strong>{formatAmount(nRewardAmount)}</strong>
                                </div>
                                <div className='dashboard-hub__desktop-reward-status'>
                                    {bCollected ? 'Collected' : bToday ? 'Today' : 'Ready'}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            <div className='dashboard-hub__desktop-card-footer'>
                <button
                    type='button'
                    className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--primary'
                    onClick={() => {
                        if (!bTodayRewardClaimed) mutateDailyRewardsClaimed();
                    }}
                    disabled={bTodayRewardClaimed || isClaimingReward}
                >
                    {bTodayRewardClaimed ? 'Collected' : isClaimingReward ? 'Collecting...' : 'Collect'}
                </button>
            </div>
        </article>
    );

    const renderDesktopPrivateCard = () => (
        <article
            id='lobby-private-table-desktop-card'
            className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--private${sActiveTab === 'lobby-private-table' ? ' is-active' : ''}`}
        >
            <header className='dashboard-hub__desktop-card-header'>
                <h3>Private Table</h3>
            </header>

            <div className='dashboard-hub__desktop-card-media'>
                <img src={privateTableImage} alt='21 Holdem private table' />
            </div>

            <div className='dashboard-hub__desktop-card-body'>
                <div className='dashboard-hub__desktop-spotlight'>
                    <strong>Host your own room</strong>
                    <span>Create a code, invite your players, and keep the table private from the public lobby.</span>
                </div>
            </div>

            <div className='dashboard-hub__desktop-card-footer'>
                <button
                    type='button'
                    className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--primary'
                    onClick={() => navigate('/private-table')}
                >
                    Create Table
                </button>
            </div>
        </article>
    );

    const renderDesktopProfileCard = () => (
        <article
            id='lobby-player-profile-desktop-card'
            className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--profile${sActiveTab === 'lobby-player-profile' ? ' is-active' : ''}`}
        >
            <header className='dashboard-hub__desktop-card-header'>
                <h3>Player Profile</h3>
            </header>

            <div className='dashboard-hub__desktop-profile-shell'>
                <div className='dashboard-hub__desktop-profile-avatar'>
                    <img
                        src={sAvatarSrc}
                        alt={profileData?.sUserName || 'Player avatar'}
                        onError={(event) => {
                            event.currentTarget.src = getAvatarImageSrc('', profileData?.sUserName);
                        }}
                    />
                </div>

                <div className='dashboard-hub__desktop-profile-name'>{_.appendSuffix(sDisplayName, 16)}</div>

                <div className='dashboard-hub__desktop-profile-stats'>
                    <div className='dashboard-hub__desktop-profile-statline'>
                        <span>Balance</span>
                        <strong>{formatAmount(profileData?.nChips)}</strong>
                    </div>
                    <div className='dashboard-hub__desktop-profile-statline'>
                        <span>Games</span>
                        <strong>{nGamesPlayed}</strong>
                    </div>
                    <div className='dashboard-hub__desktop-profile-statline'>
                        <span>Win Rate</span>
                        <strong>{nWinRate}%</strong>
                    </div>
                </div>

                <div className='dashboard-hub__desktop-profile-meter'>
                    <div className='dashboard-hub__profile-meter-label'>
                        <span>Wins</span>
                        <span>{nGamesWon}</span>
                    </div>
                    <div className='dashboard-hub__progress'>
                        <div className='dashboard-hub__progress-bar dashboard-hub__progress-bar--gold' style={{ width: `${nWinRate}%` }} />
                    </div>
                </div>

                <div className='dashboard-hub__desktop-profile-meter'>
                    <div className='dashboard-hub__profile-meter-label'>
                        <span>Losses</span>
                        <span>{nGamesLost}</span>
                    </div>
                    <div className='dashboard-hub__progress'>
                        <div className='dashboard-hub__progress-bar dashboard-hub__progress-bar--blue' style={{ width: `${nLossRate}%` }} />
                    </div>
                </div>
            </div>

            <div className='dashboard-hub__desktop-card-footer dashboard-hub__desktop-card-footer--split'>
                <button type='button' className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--secondary' onClick={() => navigate('/shop')}>
                    Deposit
                </button>
                <button type='button' className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--primary' onClick={() => navigate('/profile')}>
                    View Stats
                </button>
            </div>
        </article>
    );

    return (
        <div className='dashboard-container'>
            <section className='dashboard-hub' ref={dashboardRef}>
                <div className='dashboard-hub__backdrop' aria-hidden='true' />
                <div className='dashboard-hub__ambient-grid' aria-hidden='true' />
                <div className='dashboard-hub__lobby-atmosphere' aria-hidden='true'>
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--one' />
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--two' />
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--three' />
                    <span className='dashboard-hub__lobby-beam' />
                </div>
                {bShowWelcomeModal ? renderWelcomeModal() : null}

                <div className='dashboard-hub__shell'>
                    <header className='dashboard-hub__hero'>
                        <div className='dashboard-hub__utility-strip'>
                            <button type='button' className='dashboard-hub__player-chip' onClick={() => handleTabChange('lobby-player-profile')}>
                                <span className='dashboard-hub__player-chip-avatar'>
                                    <img
                                        src={sAvatarSrc}
                                        alt={profileData?.sUserName || 'Player avatar'}
                                        onError={(event) => {
                                            event.currentTarget.src = getAvatarImageSrc('', profileData?.sUserName);
                                        }}
                                    />
                                </span>
                                <span className='dashboard-hub__player-chip-copy'>
                                    <span className='dashboard-hub__eyebrow'>Main Lobby</span>
                                    <strong>{_.appendSuffix(sDisplayName, 14)}</strong>
                                </span>
                            </button>

                            {aUtilityPills.map((item) => (
                                <button key={item.id} type='button' className='dashboard-hub__utility-pill' onClick={() => handleTabChange(item.target)}>
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </button>
                            ))}

                            <button
                                type='button'
                                className='dashboard-hub__exit'
                                aria-label='Exit Room'
                                title='Exit Room'
                                onClick={handleLogout}
                            >
                                <FontAwesomeIcon icon={faDoorOpen} />
                            </button>
                        </div>

                        <div className='dashboard-hub__quick-links' role='tablist' aria-label='Lobby sections'>
                            {aQuickNavItems.map((item) => (
                                <button
                                    key={item.id}
                                    id={`${item.id}-tab`}
                                    type='button'
                                    role='tab'
                                    aria-label={item.label}
                                    aria-selected={sActiveTab === item.id}
                                    aria-controls={`${item.id}-panel`}
                                    tabIndex={sActiveTab === item.id ? 0 : -1}
                                    className={`dashboard-hub__quick-link${sActiveTab === item.id ? ' is-active' : ''}`}
                                    onClick={() => handleTabChange(item.id)}
                                    onKeyDown={(event) => handleTabKeyDown(event, item.id)}
                                    style={item.style}
                                    title={item.label}
                                >
                                    <span className='dashboard-hub__quick-link-veil' aria-hidden='true' />
                                    <span className='dashboard-hub__quick-link-icon'>
                                        <FontAwesomeIcon icon={item.icon} />
                                    </span>
                                    <span className='dashboard-hub__quick-link-copy'>
                                        <span className='dashboard-hub__quick-link-label'>{item.label}</span>
                                        <span className='dashboard-hub__quick-link-hint'>{item.hint}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className='dashboard-hub__desktop-stage'>
                        <div className='dashboard-hub__desktop-topbar'>
                            <div className='dashboard-hub__desktop-nav'>
                                {aQuickNavItems.map((item) => (
                                    <button
                                        key={`${item.id}-desktop-nav`}
                                        type='button'
                                        className={`dashboard-hub__desktop-nav-button${sActiveTab === item.id ? ' is-active' : ''}`}
                                        onClick={() => handleDesktopNavSelect(item.id)}
                                    >
                                        <span className='dashboard-hub__desktop-nav-icon'>
                                            <FontAwesomeIcon icon={item.icon} />
                                        </span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                type='button'
                                className='dashboard-hub__desktop-exit'
                                onClick={handleLogout}
                            >
                                <FontAwesomeIcon icon={faDoorOpen} />
                                <span>Exit Room</span>
                            </button>
                        </div>

                        <div className='dashboard-hub__desktop-grid'>
                            {renderDesktopLiveCard()}
                            {renderDesktopRewardsCard()}
                            {renderDesktopPrivateCard()}
                            {renderDesktopProfileCard()}
                        </div>
                    </div>

                    <div className='dashboard-hub__viewport'>
                        <div className='dashboard-hub__viewport-bar' aria-hidden='true'>
                            <span />
                            <span />
                            <span />
                        </div>

                        <div className='dashboard-hub__viewport-window'>
                            <section
                                id='lobby-live-tables-panel'
                                role='tabpanel'
                                aria-labelledby='lobby-live-tables-tab'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--live${sActiveTab === 'lobby-live-tables' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-live-tables'}
                            >
                                {renderLiveTablesPanel()}
                            </section>

                            <section
                                id='lobby-missions-panel'
                                role='tabpanel'
                                aria-labelledby='lobby-missions-tab'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--rewards${sActiveTab === 'lobby-missions' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-missions'}
                            >
                                {renderRewardsPanel()}
                            </section>

                            <section
                                id='lobby-private-table-panel'
                                role='tabpanel'
                                aria-labelledby='lobby-private-table-tab'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--private${sActiveTab === 'lobby-private-table' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-private-table'}
                            >
                                {renderPrivateTablePanel()}
                            </section>

                            <section
                                id='lobby-player-profile-panel'
                                role='tabpanel'
                                aria-labelledby='lobby-player-profile-tab'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--profile${sActiveTab === 'lobby-player-profile' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-player-profile'}
                            >
                                {renderProfilePanel()}
                            </section>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
