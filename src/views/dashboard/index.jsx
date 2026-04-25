import { loadStripe } from '@stripe/stripe-js';
import { faBagShopping, faGear, faGift, faShieldHalved, faTableCellsLarge, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { chips1, chips2, chips3, chips4, chips5 } from 'assets/images/shop/shop';
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query';
import { getTables, joinTable } from 'query/gameTable.query';
import { getProfile } from 'query/profile.query';
import { buyChips, getChips } from 'query/shop.query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import _ from 'scripts/helper';
import AppWordmark from 'shared/components/AppWordmark';
import DailyRewardsPanel from 'shared/components/DailyRewardsPanel';
import { BUILT_IN_AVATARS, DEFAULT_PROFILE_BANNER, getAvatarImageSrc } from 'shared/constants/builtInAvatars';
import { getCookie, ReactToastify } from 'shared/utils';
import dailyRewardsLobbyBackground from '../../assets/images/bg/daily_rewards_bg.png';
import dailyRewardsLightsVideo from '../../assets/videos/daily_rewards_lights.mp4';
import liveTablesImage from '../../assets/images/bg/live_tables.png';
import privateTableImage from '../../assets/images/bg/private_table.png';
import portraitTableImage from '../../assets/images/gameplay/portrate_table.png';

function formatAmount(amount) {
    return _.formatCurrencyWithComa(Number(amount) || 0);
}

function formatPercent(value) {
    return `${Math.max(0, Math.round(Number(value) || 0))}%`;
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
const LOBBY_TAB_IDS = ['lobby-live-tables', 'lobby-missions', 'lobby-private-table', 'lobby-player-profile', 'lobby-shop'];
const stripePromise = loadStripe('pk_live_51RKUWDCjGp9Y7z5pfEw3AFjBJPli82C2xV3NJLsSwl0KBdRlhfDJg4u5qLX9GKZmbfb6nKYc6jljLeZ3yxTPnn1M00FddDWVLA');

function hashSeed(seed = '') {
    return String(seed || '21-holdem')
        .split('')
        .reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 2147483647, 11);
}

function getTableSeatAvatars(table) {
    const nSeatCount = Math.max(0, Number(table?.nMaxPlayer) || 0);
    if (!nSeatCount || !BUILT_IN_AVATARS.length) return [];

    const nStartIndex = Math.abs(hashSeed(`${table?._id || table?.sName || table?.nMaxPlayer || 'table'}`)) % BUILT_IN_AVATARS.length;

    return Array.from({ length: nSeatCount }, (_, index) => (
        BUILT_IN_AVATARS[(nStartIndex + index) % BUILT_IN_AVATARS.length]?.sPath || DEFAULT_PROFILE_BANNER
    ));
}

function getShopChipImage(nChips) {
    if (Number(nChips) <= 100) return chips1;
    if (Number(nChips) <= 500) return chips2;
    if (Number(nChips) <= 1000) return chips3;
    if (Number(nChips) <= 2500) return chips4;
    return chips5;
}

function formatStorePrice(nPrice, sCurrency = 'USD') {
    const nNumericPrice = Number(nPrice);
    if (!Number.isFinite(nNumericPrice)) return `${nPrice ?? '-'}`;

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: sCurrency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(nNumericPrice);
    } catch (error) {
        return `$${nNumericPrice.toFixed(2)}`;
    }
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

    const { data: aShopItems = [], isLoading: isShopLoading } = useQuery('getChips', getChips, {
        select: (data) => data?.data?.data || [],
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message || 'Unable to load store items', 'error');
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

    const { mutate: mutateBuyChips, isLoading: isBuyingShopItem } = useMutation(buyChips, {
        onSuccess: async (response) => {
            const payload = response?.data;

            if (payload?.status === 200 && payload?.data?.sessionId) {
                const stripe = await stripePromise;
                const { error } = await stripe.redirectToCheckout({ sessionId: payload.data.sessionId });
                if (error) ReactToastify(error.message || 'Stripe redirect failed', 'error');
                return;
            }

            if (payload?.status === 200 || response?.status === 200) {
                ReactToastify(payload?.message || 'Purchase successful', 'success');
                queryClient.invalidateQueries('profileData');
                queryClient.invalidateQueries('getProfile');
                return;
            }

            ReactToastify(payload?.message || 'Unable to complete purchase', 'error');
        },
        onError: (error) => {
            ReactToastify(error?.response?.data?.message || 'Unable to complete purchase', 'error');
        },
    });

    const aSortedTables = useMemo(() => [...tablesData].sort(sortTablesByPriority), [tablesData]);

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

    const aFilteredTables = useMemo(() => (
        aSortedTables.filter(table => (
            Number(table.nMaxPlayer) === nActiveSeatCount
            && Number(table.nMinBuyIn) === nActiveBuyIn
        ))
    ), [aSortedTables, nActiveSeatCount, nActiveBuyIn]);

    const oBuyInPlayerCounts = useMemo(() => (
        aSortedTables.reduce((accumulator, table) => {
            const sKey = `${Number(table.nMaxPlayer) || 0}:${Number(table.nMinBuyIn) || 0}`;
            accumulator[sKey] = (accumulator[sKey] || 0) + getActivePlayers(table);
            return accumulator;
        }, {})
    ), [aSortedTables]);

    const nGamesPlayed = Number(profileData?.nGamePlayed) || 0;
    const nGamesWon = Number(profileData?.nGameWon) || 0;
    const nWinRate = nGamesPlayed ? Math.round((nGamesWon / nGamesPlayed) * 100) : 0;
    const nTotalWinnings = Number(profileData?.nTotalWinningAmount) || 0;
    const sDisplayName = profileData?.sUserName || 'Player';
    const sAvatarSrc = getAvatarImageSrc(profileData?.sAvatar, profileData?.sUserName);
    const aRewards = dataDailyRewards?.rewards?.length ? dataDailyRewards.rewards : [1000, 2500, 5000, 7500, 10000, 12500, 15000];
    const nEligibleDay = Number(dataDailyRewards?.eligibleDay) || 1;
    const bTodayRewardClaimed = Boolean(dataDailyRewards?.bTodayRewardClaimed);

    const oProfileStageStyle = useMemo(() => ({ '--profile-stage-image': `url("${sAvatarSrc || DEFAULT_PROFILE_BANNER}")` }), [sAvatarSrc]);

    const getBuyInPlayerCount = (nSeatCount, nBuyIn) => (
        oBuyInPlayerCounts[`${Number(nSeatCount) || 0}:${Number(nBuyIn) || 0}`] || 0
    );

    const aQuickNavItems = useMemo(() => ([
        { id: 'lobby-live-tables', label: 'Live Tables', icon: faTableCellsLarge, kind: 'tab' },
        { id: 'lobby-missions', label: 'Missions & Rewards', icon: faGift, kind: 'tab' },
        { id: 'lobby-private-table', label: 'Private Table', icon: faShieldHalved, kind: 'tab' },
        { id: 'lobby-player-profile', label: 'Player Profile', icon: faUser, kind: 'tab' },
        { id: 'lobby-shop', label: 'Shop', icon: faBagShopping, kind: 'tab' },
        { id: 'lobby-settings', label: 'Settings', icon: faGear, kind: 'route', path: '/profile' },
    ]), []);

    const oBestValueShopItem = useMemo(() => (
        aShopItems.reduce((oBestItem, item) => {
            const nChips = Number(item?.nChips) || 0;
            const nPrice = Number(item?.nPrice) || 0;
            if (!nChips || !nPrice) return oBestItem;

            if (!oBestItem) return item;

            const nBestRatio = (Number(oBestItem?.nChips) || 0) / (Number(oBestItem?.nPrice) || 1);
            return (nChips / nPrice) > nBestRatio ? item : oBestItem;
        }, null)
    ), [aShopItems]);

    const handleTabChange = (sTabId) => {
        setActiveTab(sTabId);
    };

    const handleQuickNavSelect = (item, { bScrollDesktop = false } = {}) => {
        if (item.kind === 'route') {
            navigate(item.path);
            return;
        }

        setActiveTab(item.id);
        if (!bScrollDesktop || typeof document === 'undefined') return;

        const oPanel = document.getElementById(`${item.id}-desktop-card`);
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

    const handleOpenShopTab = (bScrollDesktop = false) => {
        const oShopTab = aQuickNavItems.find((item) => item.id === 'lobby-shop');
        if (oShopTab) handleQuickNavSelect(oShopTab, { bScrollDesktop });
    };

    const handleBuyShopItem = (item) => {
        if (!item?.nPrice) return;
        mutateBuyChips({ nPrice: item.nPrice });
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
                        const nBuyInPlayers = getBuyInPlayerCount(nActiveSeatCount, nBuyInOption);

                        return (
                            <button
                                key={nBuyInOption}
                                type='button'
                                className={`dashboard-hub__buyin-tile${nBuyInOption === nActiveBuyIn ? ' is-active' : ''}`}
                                onClick={() => handleBuyInChange(nBuyInOption)}
                                aria-label={`${formatAmount(nBuyInOption)} buy-in, ${nBuyInPlayers} ${nBuyInPlayers === 1 ? 'player' : 'players'} active`}
                            >
                                <span className='dashboard-hub__buyin-art' aria-hidden='true'>
                                    <img src={liveTablesImage} alt='' />
                                    <span className='dashboard-hub__buyin-art-badge'>{nBuyInPlayers}</span>
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

    const renderRewardsPanel = () => (
        <>
            <header className='dashboard-hub__window-heading'>
                <h2>DAILY REWARDS</h2>
            </header>

            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--rewards'>
                <DailyRewardsPanel embedded />
            </div>
        </>
    );

    const renderStoreItems = (bCompact = false) => {
        if (!aShopItems.length) {
            return (
                <div className='dashboard-hub__empty'>
                    <strong>{isShopLoading ? 'Loading store...' : 'No store items available yet'}</strong>
                    <span>Items added in the admin portal will appear here automatically.</span>
                </div>
            );
        }

        return (
            <div className={`dashboard-hub__store-grid${bCompact ? ' dashboard-hub__store-grid--compact' : ''}`}>
                {aShopItems.map((item, index) => {
                    const sItemKey = `${item?.sTitle || 'store-item'}-${item?.nPrice || index}`;
                    const sItemTitle = item?.sTitle || 'Chip Package';
                    const sItemAmount = Number(item?.nChips) ? `${formatAmount(item.nChips)} chips` : 'Store item';
                    const sItemPrice = formatStorePrice(item?.nPrice, item?.sCurrency);
                    const bIsBestValue = oBestValueShopItem === item;

                    return (
                        <article key={sItemKey} className='dashboard-hub__store-item'>
                            {bIsBestValue ? <span className='dashboard-hub__store-tag'>Best Value</span> : null}

                            <div className='dashboard-hub__store-art'>
                                <img src={getShopChipImage(item?.nChips)} alt='' />
                            </div>

                            <div className='dashboard-hub__store-copy'>
                                <strong>{sItemTitle}</strong>
                                <span>{sItemAmount}</span>
                            </div>

                            <button
                                type='button'
                                className='dashboard-hub__store-buy'
                                onClick={() => handleBuyShopItem(item)}
                                disabled={isBuyingShopItem}
                            >
                                {isBuyingShopItem ? 'Processing...' : sItemPrice}
                            </button>
                        </article>
                    );
                })}
            </div>
        );
    };

    const renderShopPanel = () => (
        <>
            <header className='dashboard-hub__tab-header'>
                <div className='dashboard-hub__tab-copy'>
                    <span className='dashboard-hub__section-kicker'>Store</span>
                    <h2>STORE</h2>
                    <p>Chip packages now live inside the main lobby, and new store items added from the admin portal will appear here automatically.</p>
                </div>
                <div className='dashboard-hub__pill-row'>
                    <span className='dashboard-hub__pill'>Admin managed inventory</span>
                    <span className='dashboard-hub__pill'>Chip packages live</span>
                </div>
            </header>

            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--store'>
                {renderStoreItems()}
            </div>
        </>
    );

    const renderPrivateTablePanel = () => (
        <>
            <header className='dashboard-hub__tab-header'>
                <div className='dashboard-hub__tab-copy'>
                    <h2>PRIVATE TABLES</h2>
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
                    <h2>PLAYER STATS</h2>
                    <p>Rules, help, support, and account tools now live behind the settings icon on your profile page.</p>
                </div>
                <div className='dashboard-hub__pill-row'>
                    <span className='dashboard-hub__pill'>Balance {formatAmount(profileData?.nChips)}</span>
                    <span className='dashboard-hub__pill'>Win Rate {formatPercent(nWinRate)}</span>
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
                        <div className='dashboard-hub__profile-stats-grid dashboard-hub__profile-stats-grid--triple'>
                            <div className='dashboard-hub__profile-stat'>
                                <span>Hands Played</span>
                                <strong>{nGamesPlayed}</strong>
                            </div>
                            <div className='dashboard-hub__profile-stat'>
                                <span>Win %</span>
                                <strong>{formatPercent(nWinRate)}</strong>
                            </div>
                            <div className='dashboard-hub__profile-stat'>
                                <span>Total Winnings</span>
                                <strong>{formatAmount(nTotalWinnings)}</strong>
                            </div>
                        </div>

                        <div className='dashboard-hub__profile-actions'>
                            <button type='button' className='dashboard-hub__secondary-cta' onClick={() => handleOpenShopTab()}>
                                Shop
                            </button>
                            <button type='button' className='dashboard-hub__secondary-cta dashboard-hub__secondary-cta--accent' onClick={() => navigate('/profile')}>
                                Open Profile
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
                                const nBuyInPlayers = getBuyInPlayerCount(nActiveSeatCount, nBuyInOption);

                                return (
                                    <button
                                        key={`desktop-buyin-${nBuyInOption}`}
                                        type='button'
                                        className={`dashboard-hub__desktop-buyin-chip${nBuyInOption === nActiveBuyIn ? ' is-active' : ''}`}
                                        onClick={() => handleBuyInChange(nBuyInOption)}
                                        aria-label={`${formatAmount(nBuyInOption)} buy-in, ${nBuyInPlayers} ${nBuyInPlayers === 1 ? 'player' : 'players'} active`}
                                    >
                                        <span className='dashboard-hub__desktop-buyin-chip-head'>
                                            <span className='dashboard-hub__desktop-buyin-art' aria-hidden='true'>
                                                <img src={liveTablesImage} alt='' />
                                                <span className='dashboard-hub__desktop-buyin-art-badge'>{nBuyInPlayers}</span>
                                            </span>
                                            <strong>{formatAmount(nBuyInOption)}</strong>
                                        </span>
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
                <h3>DAILY REWARDS</h3>
            </header>

            <div className='dashboard-hub__desktop-card-media dashboard-hub__desktop-card-media--rewards'>
                <video className='dashboard-hub__desktop-card-media-video' autoPlay muted loop playsInline preload='auto' aria-hidden='true'>
                    <source src={dailyRewardsLightsVideo} type='video/mp4' />
                </video>
                <img src={dailyRewardsLobbyBackground} alt='21 Holdem daily rewards' />
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
                <h3>PRIVATE TABLES</h3>
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

    const renderDesktopShopCard = () => (
        <article
            id='lobby-shop-desktop-card'
            className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--shop${sActiveTab === 'lobby-shop' ? ' is-active' : ''}`}
        >
            <header className='dashboard-hub__desktop-card-header'>
                <h3>STORE</h3>
            </header>

            <div className='dashboard-hub__desktop-card-body dashboard-hub__desktop-card-body--store'>
                <div className='dashboard-hub__desktop-spotlight'>
                    <strong>Chip packages</strong>
                    <span>Buy-ins, refills, and future store items managed from the admin portal all surface here.</span>
                </div>

                {renderStoreItems(true)}
            </div>
        </article>
    );

    const renderDesktopProfileCard = () => (
        <article
            id='lobby-player-profile-desktop-card'
            className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--profile${sActiveTab === 'lobby-player-profile' ? ' is-active' : ''}`}
        >
            <header className='dashboard-hub__desktop-card-header'>
                <h3>PLAYER STATS</h3>
            </header>

            <div className='dashboard-hub__desktop-profile-shell'>
                <div className='dashboard-hub__desktop-profile-hero'>
                    <div className='dashboard-hub__desktop-profile-avatar'>
                        <img
                            src={sAvatarSrc}
                            alt={profileData?.sUserName || 'Player avatar'}
                            onError={(event) => {
                                event.currentTarget.src = getAvatarImageSrc('', profileData?.sUserName);
                            }}
                        />
                    </div>

                    <div className='dashboard-hub__desktop-profile-copy'>
                        <div className='dashboard-hub__desktop-profile-name'>{_.appendSuffix(sDisplayName, 16)}</div>
                        <div className='dashboard-hub__desktop-profile-balance'>Balance {formatAmount(profileData?.nChips)}</div>
                    </div>
                </div>

                <div className='dashboard-hub__desktop-profile-stats dashboard-hub__desktop-profile-stats--compact'>
                    <div className='dashboard-hub__desktop-profile-statline'>
                        <span>Hands Played</span>
                        <strong>{nGamesPlayed}</strong>
                    </div>
                    <div className='dashboard-hub__desktop-profile-statline'>
                        <span>Win %</span>
                        <strong>{formatPercent(nWinRate)}</strong>
                    </div>
                    <div className='dashboard-hub__desktop-profile-statline'>
                        <span>Total Winnings</span>
                        <strong>{formatAmount(nTotalWinnings)}</strong>
                    </div>
                </div>

            </div>

            <div className='dashboard-hub__desktop-card-footer dashboard-hub__desktop-card-footer--split'>
                <button type='button' className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--secondary' onClick={() => handleOpenShopTab(true)}>
                    Shop
                </button>
                <button type='button' className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--primary' onClick={() => navigate('/profile')}>
                    Open Profile
                </button>
            </div>
        </article>
    );

    return (
        <div className='dashboard-container'>
            <section className='dashboard-hub dashboard-hub--force-mobile' ref={dashboardRef}>
                <div className='dashboard-hub__backdrop' aria-hidden='true' />
                <div className='dashboard-hub__ambient-grid' aria-hidden='true' />
                <div className='dashboard-hub__lobby-atmosphere' aria-hidden='true'>
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--one' />
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--two' />
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--three' />
                    <span className='dashboard-hub__lobby-beam' />
                </div>

                <div className='dashboard-hub__shell'>
                    <header className='dashboard-hub__hero'>
                        <div className='dashboard-hub__utility-strip'>
                            <Link to='/lobby' className='dashboard-hub__brand-mark' aria-label="21 Hold'em home">
                                <AppWordmark className='dashboard-hub__brand-mark-svg' />
                            </Link>

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
                                    <strong>{_.appendSuffix(sDisplayName, 14)}</strong>
                                    <span className='dashboard-hub__player-chip-balance'>
                                        <span className='dashboard-hub__player-chip-balance-label'>Bankroll</span>
                                        <span className='dashboard-hub__player-chip-balance-value'>{formatAmount(profileData?.nChips)}</span>
                                    </span>
                                </span>
                            </button>

                        </div>

                        <nav className='dashboard-hub__quick-links' aria-label='Lobby shortcuts'>
                            {aQuickNavItems.map((item) => {
                                const bIsActive = item.kind === 'tab' && sActiveTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type='button'
                                        aria-label={item.label}
                                        aria-pressed={item.kind === 'tab' ? bIsActive : undefined}
                                        className={`dashboard-hub__quick-link${bIsActive ? ' is-active' : ''}`}
                                        onClick={() => handleQuickNavSelect(item)}
                                        title={item.label}
                                    >
                                        <span className='dashboard-hub__quick-link-icon'>
                                            <FontAwesomeIcon icon={item.icon} />
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </header>

                    <div className='dashboard-hub__desktop-stage'>
                        <div className='dashboard-hub__desktop-topbar'>
                            <nav className='dashboard-hub__desktop-nav' aria-label='Lobby shortcuts'>
                                {aQuickNavItems.map((item) => {
                                    const bIsActive = item.kind === 'tab' && sActiveTab === item.id;

                                    return (
                                        <button
                                            key={`${item.id}-desktop-nav`}
                                            type='button'
                                            className={`dashboard-hub__desktop-nav-button${bIsActive ? ' is-active' : ''}`}
                                            onClick={() => handleQuickNavSelect(item, { bScrollDesktop: true })}
                                            aria-label={item.label}
                                            aria-pressed={item.kind === 'tab' ? bIsActive : undefined}
                                            title={item.label}
                                        >
                                            <span className='dashboard-hub__desktop-nav-icon'>
                                                <FontAwesomeIcon icon={item.icon} />
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className='dashboard-hub__desktop-grid'>
                            {renderDesktopLiveCard()}
                            {renderDesktopRewardsCard()}
                            {renderDesktopPrivateCard()}
                            {renderDesktopProfileCard()}
                            {renderDesktopShopCard()}
                        </div>
                    </div>

                    <div className='dashboard-hub__viewport'>
                        <div className='dashboard-hub__viewport-window'>
                            <section
                                id='lobby-live-tables-panel'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--live${sActiveTab === 'lobby-live-tables' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-live-tables'}
                            >
                                {renderLiveTablesPanel()}
                            </section>

                            <section
                                id='lobby-missions-panel'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--rewards${sActiveTab === 'lobby-missions' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-missions'}
                            >
                                {renderRewardsPanel()}
                            </section>

                            <section
                                id='lobby-private-table-panel'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--private${sActiveTab === 'lobby-private-table' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-private-table'}
                            >
                                {renderPrivateTablePanel()}
                            </section>

                            <section
                                id='lobby-player-profile-panel'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--profile${sActiveTab === 'lobby-player-profile' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-player-profile'}
                            >
                                {renderProfilePanel()}
                            </section>

                            <section
                                id='lobby-shop-panel'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--shop${sActiveTab === 'lobby-shop' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-shop'}
                            >
                                {renderShopPanel()}
                            </section>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;

