import { loadStripe } from '@stripe/stripe-js';
import iconLobby from '../../assets/images/icons/working/live tables.png';
import iconPrivate from '../../assets/images/icons/working/private.png';
import iconProfile from '../../assets/images/icons/working/profile (2).png';
import iconRewards from '../../assets/images/icons/working/rewards.png';
import iconShop from '../../assets/images/icons/working/shop.png';
import iconSettings from '../../assets/images/icons/working/stats.png';
import { chips1, chips2, chips3, chips4, chips5 } from 'assets/images/shop/shop';
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query';
import { getTables, joinTable } from 'query/gameTable.query';
import { getProfile } from 'query/profile.query';
import { buyChips, confirmPayment, getChips } from 'query/shop.query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import _ from 'scripts/helper';
import DailyRewardsPanel from 'shared/components/DailyRewardsPanel';
import { DEFAULT_PROFILE_BANNER, getAvatarImageSrc } from 'shared/constants/builtInAvatars';
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

function getArrayPayload(value) {
    return Array.isArray(value) ? value : [];
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
const LOBBY_TAB_IDS = ['lobby-live-tables', 'lobby-missions', 'lobby-private-table', 'lobby-player-profile', 'lobby-shop', 'lobby-settings'];
const TABLE_SEAT_COLORS = ['#d4af6a', '#58c7ff', '#ff6b8a', '#7ee081', '#c38cff', '#ffb15c', '#5eead4', '#f7e36b', '#9bb6ff'];
const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
    : Promise.resolve(null);

function hashSeed(seed = '') {
    return String(seed || '21-holdem')
        .split('')
        .reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 2147483647, 11);
}

function getSeatInitials(seed, index) {
    const sCleanSeed = String(seed || 'PLAYER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PLAYER';
    const nSeedLength = sCleanSeed.length;
    const sFirst = sCleanSeed[index % nSeedLength] || 'P';
    const sSecond = sCleanSeed[(nSeedLength - 1 - index + nSeedLength) % nSeedLength] || 'L';
    return `${sFirst}${sSecond}`;
}

function getTableSeatMarkers(table) {
    const nSeatCount = Math.max(0, Number(table?.nMaxPlayer) || 0);
    if (!nSeatCount) return [];

    const sSeed = `${table?._id || table?.sName || table?.nMaxPlayer || 'table'}`;
    const nStartIndex = Math.abs(hashSeed(sSeed)) % TABLE_SEAT_COLORS.length;

    return Array.from({ length: nSeatCount }, (_, index) => ({
        initials: getSeatInitials(sSeed, index),
        color: TABLE_SEAT_COLORS[(nStartIndex + index) % TABLE_SEAT_COLORS.length],
    }));
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
    const carouselPointerRef = useRef({ x: 0, y: 0, active: false });
    const carouselSuppressClickRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [sActiveTab, setActiveTab] = useState('lobby-live-tables');
    const [, setActiveSeatCount] = useState(PLAYER_OPTIONS[0]);
    const [nActiveBuyIn, setActiveBuyIn] = useState(BUY_IN_OPTIONS[0]);
    const [bHasAdjustedFilters, setHasAdjustedFilters] = useState(false);
    const [nCarouselDragOffset, setCarouselDragOffset] = useState(0);

    const { data: tablesData = [], isLoading: isDataTableLoading } = useQuery('getTables', getTables, {
        select: (data) => getArrayPayload(data?.data?.data),
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
        select: (data) => getArrayPayload(data?.data?.data),
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

            if (response?.status === 200 && payload?.data?.sessionId) {
                const stripe = await stripePromise;
                if (!stripe) {
                    if (payload?.data?.checkoutUrl) {
                        window.location.assign(payload.data.checkoutUrl);
                        return;
                    }
                    ReactToastify('Stripe publishable key is not configured and checkout URL was not returned', 'error');
                    return;
                }
                const { error } = await stripe.redirectToCheckout({ sessionId: payload.data.sessionId });
                if (error && payload?.data?.checkoutUrl) {
                    window.location.assign(payload.data.checkoutUrl);
                    return;
                }
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

    const aSafeShopItems = useMemo(() => getArrayPayload(aShopItems).filter(Boolean), [aShopItems]);
    const aSortedTables = useMemo(() => (
        getArrayPayload(tablesData)
            .filter(Boolean)
            .sort(sortTablesByPriority)
    ), [tablesData]);

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
        const oParams = new URLSearchParams(location.search);
        const sCheckoutStatus = oParams.get('checkout');
        const sSessionId = oParams.get('session_id');
        if (sCheckoutStatus !== 'success' || !sSessionId) return;

        confirmPayment({ session_id: sSessionId })
            .then((response) => {
                ReactToastify(response?.data?.message || 'Payment confirmed', 'success');
                queryClient.invalidateQueries('profileData');
                queryClient.invalidateQueries('getProfile');
            })
            .catch((error) => {
                ReactToastify(error?.response?.data?.message || 'Unable to confirm payment', 'error');
            })
            .finally(() => {
                oParams.delete('checkout');
                oParams.delete('session_id');
                navigate(`/lobby?${oParams.toString()}`, { replace: true });
            });
    }, [location.search, navigate, queryClient]);

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
            Number(table.nMinBuyIn) === nActiveBuyIn
        ))
    ), [aSortedTables, nActiveBuyIn]);

    const oBuyInPlayerCounts = useMemo(() => (
        aSortedTables.reduce((accumulator, table) => {
            const nKey = Number(table.nMinBuyIn) || 0;
            accumulator[nKey] = (accumulator[nKey] || 0) + getActivePlayers(table);
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

    const getBuyInPlayerCount = (nBuyIn) => (
        oBuyInPlayerCounts[Number(nBuyIn) || 0] || 0
    );

    const aQuickNavItems = useMemo(() => ([
        {
            id: 'lobby-live-tables',
            label: 'Live Tables',
            iconSrc: iconLobby,
            kind: 'tab',
            theme: {
                '--dashboard-theme-rgb': '48, 91, 166',
                '--dashboard-theme-soft-rgb': '18, 38, 92',
                '--dashboard-theme-accent-rgb': '130, 190, 255',
            },
        },
        {
            id: 'lobby-missions',
            label: 'Missions & Rewards',
            iconSrc: iconRewards,
            kind: 'tab',
            theme: {
                '--dashboard-theme-rgb': '226, 169, 35',
                '--dashboard-theme-soft-rgb': '108, 66, 12',
                '--dashboard-theme-accent-rgb': '255, 226, 122',
            },
        },
        {
            id: 'lobby-private-table',
            label: 'Private Table',
            iconSrc: iconPrivate,
            kind: 'tab',
            theme: {
                '--dashboard-theme-rgb': '163, 53, 54',
                '--dashboard-theme-soft-rgb': '92, 24, 30',
                '--dashboard-theme-accent-rgb': '255, 154, 132',
            },
        },
        {
            id: 'lobby-player-profile',
            label: 'Stats',
            iconSrc: iconProfile,
            kind: 'tab',
            theme: {
                '--dashboard-theme-rgb': '188, 107, 33',
                '--dashboard-theme-soft-rgb': '96, 48, 18',
                '--dashboard-theme-accent-rgb': '255, 198, 112',
            },
        },
        {
            id: 'lobby-shop',
            label: 'Shop',
            iconSrc: iconShop,
            kind: 'tab',
            theme: {
                '--dashboard-theme-rgb': '51, 165, 86',
                '--dashboard-theme-soft-rgb': '20, 91, 52',
                '--dashboard-theme-accent-rgb': '147, 255, 180',
            },
        },
        {
            id: 'lobby-settings',
            label: 'Settings',
            iconSrc: iconSettings,
            kind: 'tab',
            theme: {
                '--dashboard-theme-rgb': '89, 126, 181',
                '--dashboard-theme-soft-rgb': '36, 58, 105',
                '--dashboard-theme-accent-rgb': '174, 210, 255',
            },
        },
    ]), []);

    const nActiveCarouselIndex = Math.max(0, aQuickNavItems.findIndex((item) => item.id === sActiveTab));
    const oActiveCarouselItem = aQuickNavItems[nActiveCarouselIndex] || aQuickNavItems[0];

    const getLobbyIconBackgroundStyle = (sItemId) => {
        const oItem = aQuickNavItems.find((item) => item.id === sItemId);
        return oItem?.iconSrc ? { '--dashboard-page-icon': `url("${oItem.iconSrc}")` } : undefined;
    };

    const oActiveLobbyIconBackgroundStyle = oActiveCarouselItem?.iconSrc
        ? {
            '--dashboard-page-icon': `url("${oActiveCarouselItem.iconSrc}")`,
            ...(oActiveCarouselItem.theme || {}),
        }
        : undefined;
    const sActiveSceneName = (sActiveTab || '').replace(/^lobby-/, '').replace(/[^a-z0-9]+/g, '-');
    const sDashboardSceneClass = ` dashboard-hub--themed-scene dashboard-hub--scene-${sActiveSceneName}`;

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;

        const rootStyle = document.documentElement.style;
        const theme = oActiveCarouselItem?.theme || {};
        Object.entries(theme).forEach(([key, value]) => {
            rootStyle.setProperty(key, value);
        });

        return () => {
            Object.keys(theme).forEach((key) => rootStyle.removeProperty(key));
        };
    }, [oActiveCarouselItem]);

    const oBestValueShopItem = useMemo(() => (
        aSafeShopItems.reduce((oBestItem, item) => {
            const nChips = Number(item?.nChips) || 0;
            const nPrice = Number(item?.nPrice) || 0;
            if (!nChips || !nPrice) return oBestItem;

            if (!oBestItem) return item;

            const nBestRatio = (Number(oBestItem?.nChips) || 0) / (Number(oBestItem?.nPrice) || 1);
            return (nChips / nPrice) > nBestRatio ? item : oBestItem;
        }, null)
    ), [aSafeShopItems]);

    const handleQuickNavSelect = (item, { bScrollDesktop = false } = {}) => {
        if (item?.path) {
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

    const handleCarouselStep = (nDirection) => {
        if (!aQuickNavItems.length) return;
        const nNextIndex = (nActiveCarouselIndex + nDirection + aQuickNavItems.length) % aQuickNavItems.length;
        handleQuickNavSelect(aQuickNavItems[nNextIndex]);
    };

    const startCarouselDrag = (x, y, width, left = 0) => {
        carouselPointerRef.current = {
            active: true,
            dragged: false,
            x,
            y,
            width: width || 320,
            left,
        };
    };

    const updateCarouselDrag = (x, y) => {
        const oPointer = carouselPointerRef.current;
        if (!oPointer.active) return;

        const nDragDistance = Math.max(90, Math.min(180, (oPointer.width || 320) * 0.2));
        const nDeltaX = x - oPointer.x;
        const nDeltaY = y - oPointer.y;
        if (Math.abs(nDeltaX) > 6 && Math.abs(nDeltaX) > Math.abs(nDeltaY)) {
            carouselPointerRef.current.dragged = true;
        }
        const nNextDragOffset = Math.max(-1.35, Math.min(1.35, -nDeltaX / nDragDistance));
        setCarouselDragOffset(nNextDragOffset);
    };

    const finishCarouselDrag = (x, y) => {
        const oPointer = carouselPointerRef.current;
        if (!oPointer.active) return;

        const bWasDragged = Boolean(oPointer.dragged);
        carouselPointerRef.current = { x: 0, y: 0, active: false };
        setCarouselDragOffset(0);

        const nDeltaX = x - oPointer.x;
        const nDeltaY = y - oPointer.y;
        const nDragDistance = Math.max(90, Math.min(180, (oPointer.width || 320) * 0.2));
        const nStartOffsetFromCenter = oPointer.x - ((oPointer.left || 0) + ((oPointer.width || 320) / 2));
        const nClickZoneThreshold = Math.max(54, Math.min(104, (oPointer.width || 320) * 0.16));

        if (!bWasDragged && Math.abs(nDeltaX) < 8 && Math.abs(nDeltaY) < 8 && Math.abs(nStartOffsetFromCenter) > nClickZoneThreshold) {
            carouselSuppressClickRef.current = true;
            window.setTimeout(() => {
                carouselSuppressClickRef.current = false;
            }, 120);
            handleCarouselStep(nStartOffsetFromCenter > 0 ? 1 : -1);
            return;
        }

        if (bWasDragged) {
            carouselSuppressClickRef.current = true;
            window.setTimeout(() => {
                carouselSuppressClickRef.current = false;
            }, 220);
        }

        if (Math.abs(nDeltaX) < 28 || Math.abs(nDeltaX) < Math.abs(nDeltaY) * 1.15) return;
        if (Math.abs(nDeltaX / nDragDistance) < 0.18) return;

        handleCarouselStep(nDeltaX < 0 ? 1 : -1);
    };

    const cancelCarouselDrag = () => {
        carouselPointerRef.current = { x: 0, y: 0, active: false };
        setCarouselDragOffset(0);
    };

    const handleCarouselPointerDown = (event) => {
        if (event.pointerType === 'touch') return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const { width, left } = event.currentTarget.getBoundingClientRect();
        startCarouselDrag(event.clientX, event.clientY, width, left);
    };

    const handleCarouselPointerMove = (event) => {
        if (event.pointerType === 'touch') return;
        updateCarouselDrag(event.clientX, event.clientY);
    };

    const handleCarouselPointerEnd = (event) => {
        if (event.pointerType === 'touch') return;
        finishCarouselDrag(event.clientX, event.clientY);
    };

    const handleCarouselTouchStart = (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        const { width, left } = event.currentTarget.getBoundingClientRect();
        startCarouselDrag(touch.clientX, touch.clientY, width, left);
    };

    const handleCarouselTouchMove = (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        updateCarouselDrag(touch.clientX, touch.clientY);
        if (carouselPointerRef.current?.dragged) event.preventDefault();
    };

    const handleCarouselTouchEnd = (event) => {
        const touch = event.changedTouches?.[0];
        if (!touch) {
            cancelCarouselDrag();
            return;
        }
        finishCarouselDrag(touch.clientX, touch.clientY);
    };

    const handleCarouselItemClick = (event, item) => {
        if (carouselSuppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        handleQuickNavSelect(item);
    };

    const getCarouselOffset = (nItemIndex) => {
        const nTotalItems = aQuickNavItems.length;
        const nRawOffset = nItemIndex - nActiveCarouselIndex;
        const nHalfItems = Math.floor(nTotalItems / 2);

        if (nRawOffset > nHalfItems) return nRawOffset - nTotalItems;
        if (nRawOffset < -nHalfItems) return nRawOffset + nTotalItems;
        return nRawOffset;
    };

    const getCarouselItemStyle = (nItemIndex) => {
        const nVisualOffset = getCarouselOffset(nItemIndex) - nCarouselDragOffset;
        const nViewportWidth = typeof window === 'undefined' ? 420 : window.innerWidth;
        const nSide = Math.max(-1, Math.min(1, nVisualOffset));
        const nFocus = Math.max(0, Math.min(1, 1 - Math.abs(nVisualOffset)));
        const nScale = 0.5 + (nFocus * 0.5);
        const nOpacity = 0.5 + (nFocus * 0.5);
        const nRadius = Math.max(61, Math.min(141, nViewportWidth * 0.192));

        return {
            '--carousel-x': `${Math.round(nSide * nRadius)}px`,
            '--carousel-y': `${Math.round(Math.abs(nVisualOffset) * 18)}px`,
            '--carousel-scale': nScale.toFixed(3),
            '--carousel-opacity': nOpacity.toFixed(3),
            '--carousel-brightness': (0.72 + (nFocus * 0.36)).toFixed(3),
            zIndex: Math.round(80 + (nFocus * 80)),
        };
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
            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--live'>
                <span className='dashboard-hub__live-label'>Buy-in</span>
                <div className='dashboard-hub__buyin-grid' role='group' aria-label='Choose buy-in'>
                    {BUY_IN_OPTIONS.map((nBuyInOption) => {
                        const oBuyInTable = aSortedTables.find((table) => (
                            Number(table.nMinBuyIn) === nBuyInOption
                        ));
                        const nBuyInPlayers = getBuyInPlayerCount(nBuyInOption);

                        return (
                            <button
                                key={nBuyInOption}
                                type='button'
                                className={`dashboard-hub__buyin-tile${nBuyInOption === nActiveBuyIn ? ' is-active' : ''}`}
                                onClick={() => handleBuyInChange(nBuyInOption)}
                                aria-label={`${formatAmount(nBuyInOption)} buy-in, ${nBuyInPlayers} ${nBuyInPlayers === 1 ? 'player' : 'players'} active`}
                            >
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
                        {aFilteredTables.map((table, index) => {
                            const nOccupied = getActivePlayers(table);
                            const nTotalSeats = Number(table.nMaxPlayer) || 0;
                            const nOpenSeats = Math.max(0, nTotalSeats - nOccupied);
                            const aSeatMarkers = getTableSeatMarkers(table);
                            const sTableId = table?._id || table?.id || `${table?.sName || 'table'}-${index}`;
                            const sTableName = table?.sName || 'Live Table';

                            return (
                                <li key={sTableId}>
                                    <button
                                        type='button'
                                        className='dashboard-hub__table-card'
                                        onClick={() => joinTableMutate(table?._id || table?.id)}
                                        disabled={joinTableLoading || !(table?._id || table?.id)}
                                        aria-label={`${sTableName}: ${nOccupied} playing, ${nOpenSeats} seat${nOpenSeats === 1 ? '' : 's'} open.`}
                                    >
                                        <span className='dashboard-hub__table-card-art' aria-hidden='true'>
                                            <img src={portraitTableImage} alt='' />
                                        </span>
                                        <span className='dashboard-hub__table-card-copy'>
                                            <span className='dashboard-hub__table-card-header'>
                                                <strong>{sTableName}</strong>
                                            </span>
                                            <span className='dashboard-hub__table-card-avatars' aria-hidden='true'>
                                                {Array.from({ length: nTotalSeats }, (_, index) => {
                                                    const bFilled = index < nOccupied;
                                                    return (
                                                        <span
                                                            key={`${sTableId}-seat-${index + 1}`}
                                                            className={`dashboard-hub__table-card-avatar${bFilled ? '' : ' is-empty'}`}
                                                        >
                                                            {bFilled ? (
                                                                <span
                                                                    className='dashboard-hub__table-card-initials'
                                                                    style={{ '--seat-color': aSeatMarkers[index]?.color }}
                                                                >
                                                                    {aSeatMarkers[index]?.initials || 'PL'}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    );
                                                })}
                                            </span>
                                            <span className='dashboard-hub__table-card-cta'>
                                                {nOccupied > 0
                                                    ? `${nOccupied} ${nOccupied === 1 ? 'person' : 'people'} playing — tap to join`
                                                    : `${nOpenSeats} seat${nOpenSeats === 1 ? '' : 's'} open — be the first`
                                                }
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                {!aFilteredTables.length ? (
                    <div className='dashboard-hub__empty'>
                        <strong>{isDataTableLoading ? 'Loading tables...' : 'No tables at this buy-in yet'}</strong>
                        <span>Try another buy-in to find an open table.</span>
                    </div>
                ) : null}
            </div>
        </>
    );

    const renderRewardsPanel = () => (
        <>
            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--rewards'>
                <DailyRewardsPanel embedded />
            </div>
        </>
    );

    const renderStoreItems = (bCompact = false) => {
        if (!aSafeShopItems.length) {
            return (
                <div className='dashboard-hub__empty'>
                    <strong>{isShopLoading ? 'Loading store...' : 'No store items available yet'}</strong>
                    <span>Items added in the admin portal will appear here automatically.</span>
                </div>
            );
        }

        return (
            <div className={`dashboard-hub__store-grid${bCompact ? ' dashboard-hub__store-grid--compact' : ''}`}>
                {aSafeShopItems.map((item, index) => {
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
            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--store'>
                {renderStoreItems()}
            </div>
        </>
    );

    const renderPrivateTablePanel = () => (
        <>
            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--private'>
                <div className='dashboard-hub__tab-stack'>
                    <div className='dashboard-hub__card-media'>
                        <img src={privateTableImage} alt='21 Holdem private table' />
                    </div>

                    <button
                        type='button'
                        className='dashboard-hub__cta dashboard-hub__cta--private'
                        onClick={() => navigate('/private-table')}
                    >
                        Create Private Table
                    </button>
                </div>
            </div>
        </>
    );

    const renderProfilePanel = () => (
        <>
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
        const nFeaturedOccupied = oFeaturedTable ? getActivePlayers(oFeaturedTable) : 0;
        const aSeatMarkers = oFeaturedTable ? getTableSeatMarkers(oFeaturedTable) : [];

        return (
        <article
            id='lobby-live-tables-desktop-card'
            className={`dashboard-hub__desktop-card dashboard-hub__desktop-card--live${sActiveTab === 'lobby-live-tables' ? ' is-active' : ''}`}
            style={getLobbyIconBackgroundStyle('lobby-live-tables')}
        >
                <header className='dashboard-hub__desktop-card-header'>
                    <h3>Live Tables</h3>
                </header>

                <div className='dashboard-hub__desktop-card-media'>
                    <img src={liveTablesImage} alt='21 Holdem live tables' />
                </div>

                <div className='dashboard-hub__desktop-card-body dashboard-hub__desktop-card-body--live'>
                    <div className='dashboard-hub__desktop-filter-block'>
                        <span className='dashboard-hub__desktop-filter-label'>Buy-In</span>
                        <div className='dashboard-hub__desktop-buyin-grid' role='group' aria-label='Choose buy-in'>
                            {BUY_IN_OPTIONS.map((nBuyInOption) => {
                                const oBuyInTable = aSortedTables.find((table) => (
                                    Number(table.nMinBuyIn) === nBuyInOption
                                ));
                                const nBuyInPlayers = getBuyInPlayerCount(nBuyInOption);

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
                            <span>{oFeaturedTable ? `${oFeaturedTable.nMaxPlayer}-player setup` : 'Select a buy-in'}</span>
                            <span>{oFeaturedTable ? getBlindLabel(oFeaturedTable.nMinBet) : 'Blind amount waiting'}</span>
                        </div>
                        {oFeaturedTable ? (
                            <div className='dashboard-hub__desktop-seat-strip' aria-hidden='true'>
                                {Array.from({ length: oFeaturedTable.nMaxPlayer }, (_, index) => {
                                    const bFilled = index < nFeaturedOccupied;
                                    return (
                                        <span
                                            key={`desktop-live-seat-${index + 1}`}
                                            className={`dashboard-hub__table-card-avatar${bFilled ? '' : ' is-empty'}`}
                                        >
                                            {bFilled ? (
                                                <span
                                                    className='dashboard-hub__table-card-initials'
                                                    style={{ '--seat-color': aSeatMarkers[index]?.color }}
                                                >
                                                    {aSeatMarkers[index]?.initials || 'PL'}
                                                </span>
                                            ) : null}
                                        </span>
                                    );
                                })}
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
            style={getLobbyIconBackgroundStyle('lobby-missions')}
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
            style={getLobbyIconBackgroundStyle('lobby-private-table')}
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
            style={getLobbyIconBackgroundStyle('lobby-shop')}
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
            style={getLobbyIconBackgroundStyle('lobby-player-profile')}
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

    const renderSettingsPanel = () => (
        <>
            <div className='dashboard-hub__tab-body dashboard-hub__tab-body--settings'>
                <div className='dashboard-hub__settings-card'>
                    <span className='dashboard-hub__section-kicker'>Account Controls</span>
                    <strong>Manage your profile, sound, security, and account preferences.</strong>
                    <p>Open settings when you want to update your player details or adjust how the game feels.</p>
                    <button type='button' className='dashboard-hub__desktop-cta dashboard-hub__desktop-cta--primary' onClick={() => navigate('/profile')}>
                        Open Settings
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className='dashboard-container'>
            <section className={`dashboard-hub dashboard-hub--force-mobile${sDashboardSceneClass}`} ref={dashboardRef} style={oActiveLobbyIconBackgroundStyle}>
                <div className='dashboard-hub__backdrop' aria-hidden='true' />
                <div className='dashboard-hub__ambient-grid' aria-hidden='true' />
                <div className='dashboard-hub__stage-lights' aria-hidden='true'>
                    <span className='dashboard-hub__stage-beam dashboard-hub__stage-beam--one' />
                    <span className='dashboard-hub__stage-beam dashboard-hub__stage-beam--two' />
                    <span className='dashboard-hub__stage-beam dashboard-hub__stage-beam--three' />
                    <span className='dashboard-hub__stage-beam dashboard-hub__stage-beam--four' />
                    <span className='dashboard-hub__stage-beam dashboard-hub__stage-beam--five' />
                    <span className='dashboard-hub__stage-fixture dashboard-hub__stage-fixture--one' />
                    <span className='dashboard-hub__stage-fixture dashboard-hub__stage-fixture--two' />
                    <span className='dashboard-hub__stage-fixture dashboard-hub__stage-fixture--three' />
                    <span className='dashboard-hub__stage-fixture dashboard-hub__stage-fixture--four' />
                    <span className='dashboard-hub__stage-fixture dashboard-hub__stage-fixture--five' />
                </div>
                <div className='dashboard-hub__lobby-atmosphere' aria-hidden='true'>
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--one' />
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--two' />
                    <span className='dashboard-hub__lobby-orb dashboard-hub__lobby-orb--three' />
                    <span className='dashboard-hub__lobby-beam' />
                </div>

                <div className='dashboard-hub__shell'>
                    <header className='dashboard-hub__hero'>
                        <div className={`dashboard-hub__icon-carousel${Math.abs(nCarouselDragOffset) > 0.02 ? ' is-dragging' : ''}`} aria-label='Lobby pages'>
                            <div className='dashboard-hub__carousel-label' aria-live='polite'>
                                {oActiveCarouselItem?.label}
                            </div>

                            <div
                                className='dashboard-hub__carousel-track'
                                onPointerDown={handleCarouselPointerDown}
                                onPointerMove={handleCarouselPointerMove}
                                onPointerUp={handleCarouselPointerEnd}
                                onPointerCancel={cancelCarouselDrag}
                                onPointerLeave={handleCarouselPointerEnd}
                                onTouchStart={handleCarouselTouchStart}
                                onTouchMove={handleCarouselTouchMove}
                                onTouchEnd={handleCarouselTouchEnd}
                                onTouchCancel={cancelCarouselDrag}
                            >
                                {aQuickNavItems.map((item, nItemIndex) => {
                                    const nOffset = getCarouselOffset(nItemIndex);
                                    if (Math.abs(nOffset) > 1) return null;

                                    const bIsActive = sActiveTab === item.id;
                                    const nAbsOffset = Math.abs(nOffset);
                                    const sDepthClass = nAbsOffset === 0 ? ' is-active' : ' is-near';

                                    return (
                                        <button
                                            key={item.id}
                                            type='button'
                                            aria-label={item.label}
                                            aria-pressed={bIsActive}
                                            className={`dashboard-hub__carousel-item${sDepthClass}`}
                                            style={getCarouselItemStyle(nItemIndex)}
                                            onClick={(event) => handleCarouselItemClick(event, item)}
                                            title={item.label}
                                        >
                                            <span className='dashboard-hub__carousel-icon'>
                                                <img src={item.iconSrc} alt='' aria-hidden='true' />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
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
                                                <img src={item.iconSrc} alt='' aria-hidden='true' />
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

                            <section
                                id='lobby-settings-panel'
                                className={`dashboard-hub__tab-panel dashboard-hub__tab-panel--settings${sActiveTab === 'lobby-settings' ? ' is-active' : ''}`}
                                hidden={sActiveTab !== 'lobby-settings'}
                            >
                                {renderSettingsPanel()}
                            </section>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
