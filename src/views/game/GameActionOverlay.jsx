import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { getProfile } from '../../query/profile.query';
import _ from '../../scripts/helper';
import chipIcon from '../../assets/images/gameplay/chip_icon.png';
import twentyOneIcon from '../../assets/images/icons/new21.png';
import flushIcon from '../../assets/images/icons/newflush.png';
import straightIcon from '../../assets/images/icons/newstraight.png';
import clubImage from '../../assets/images/card/club.png';
import diamondImage from '../../assets/images/card/diamond.png';
import heartImage from '../../assets/images/card/heart.png';
import spadeImage from '../../assets/images/card/spades.png';
import cardFrontImage from '../../assets/images/card/card_front.png';
import {
    createHiddenGameActionOverlayState,
    emitGameActionOverlayCommand,
    GAME_ACTION_OVERLAY_STATE_EVENT,
} from '../../scripts/gameActionOverlayBridge';
import { GAME_BROWSER_EVENTS } from '../../scripts/gameEvents';
import { getAvatarImageSrc } from '../../shared/constants/builtInAvatars';
import EmojiPicker from './EmojiPicker';

const DEBUG_CONSOLE_LAYOUT = false;
const CONSOLE_LAYOUT_STYLE = {
    '--console-left-width': '58%',
    '--console-center-width': '0%',
    '--console-right-width': '42%',
};

function SoundToggle() {
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        const onState = (e) => setMuted(!!e?.detail?.muted);
        window.addEventListener(GAME_BROWSER_EVENTS.SOUND_STATE, onState);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.SOUND_STATE, onState);
    }, []);

    const handleClick = () => {
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SOUND_TOGGLE));
    };

    return (
        <button
            type='button'
            className={`sound-toggle${muted ? ' sound-toggle--muted' : ''}`}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            onClick={handleClick}
        >
            {muted ? '🔇' : '🔊'}
        </button>
    );
}

function ExitUtilityButton() {
    return (
        <button
            type='button'
            className='game-stage-utility__exit-btn'
            onClick={() => emitGameActionOverlayCommand('exitTable')}
            aria-label='Exit table'
        >
            Exit
        </button>
    );
}

const SIDE_BET_STEP = 100;
const SIDE_BET_MAX = 5000;
const SIDE_BET_INFO = [
    { title: '21', text: 'Your final hand total is exactly 21. Pays 3:1 plus your stake.' },
    { title: 'Flush', text: 'Your card and community cards make three or more cards of one suit. Pays 4:1 plus your stake.' },
    { title: 'Straight', text: 'Your card and community cards make three or more running ranks. Pays 5:1 plus your stake.' },
    { title: 'Straight Flush', text: 'A qualifying straight is also all one suit. Pays 10:1 on the Straight side bet.' },
];

const SIDE_BET_OPTIONS = [
    {
        id: 'straight',
        label: 'Straight',
        icon: straightIcon,
        fallback: '',
        variant: 'straight',
    },
    {
        id: 'flush',
        label: 'Flush',
        icon: flushIcon,
        fallback: 'Flush',
        variant: 'flush',
    },
    {
        id: 'twenty-one',
        label: '21',
        icon: twentyOneIcon,
        fallback: '',
        variant: 'twenty-one',
    },
];

const createInitialSideBets = () => SIDE_BET_OPTIONS.reduce((accumulator, option) => ({
    ...accumulator,
    [option.id]: 0,
}), {});

function SideBetsModule({ bets, disabled = false, isFocus = false, isTable = false, showHeading = false, statuses = {}, unitAmount = SIDE_BET_STEP, onAdd, onClear }) {
    const stopSideBetPointer = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div
            className={`game-action-overlay__side-bets container_side_bets${isFocus ? ' game-action-overlay__side-bets--focus' : ''}${isTable ? ' game-action-overlay__side-bets--table' : ''}`}
            aria-label='Side bets'
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            {isTable && showHeading ? (
                <div className='game-action-overlay__side-bets-arc' aria-hidden='true'>
                    <span>Place Side Bets</span>
                </div>
            ) : null}
            <div className='game-action-overlay__side-bets-rows'>
                {SIDE_BET_OPTIONS.map((bet) => (
                    <div className={`game-action-overlay__side-bet${!bets[bet.id] ? ' is-empty' : ''}${statuses[bet.id]?.unqualified ? ' is-unqualified' : ''}${statuses[bet.id]?.paid ? ' is-paid' : ''}`} key={bet.id}>
                        <button
                            type='button'
                            className={`game-action-overlay__side-bet-icon game-action-overlay__side-bet-icon--${bet.variant}`}
                            aria-label={`Add ${_.formatCurrencyWithComa(unitAmount)} chips to ${bet.label}`}
                            disabled={disabled}
                            onPointerDown={stopSideBetPointer}
                            onClick={(event) => {
                                stopSideBetPointer(event);
                                onAdd(bet.id);
                            }}
                        >
                            {bet.icon ? (
                                <img src={bet.icon} alt='' draggable='false' />
                            ) : (
                                <span>{bet.fallback}</span>
                            )}
                        </button>
                        {bets[bet.id] ? (
                            <button
                                type='button'
                                className='game-action-overlay__side-bet-badge'
                                aria-label={`Clear ${bet.label} side bet`}
                                disabled={disabled}
                                onPointerDown={stopSideBetPointer}
                                onClick={(event) => {
                                    stopSideBetPointer(event);
                                    onClear(bet.id);
                                }}
                            >
                                <img src={chipIcon} alt='' draggable='false' />
                                <span>{_.formatCurrencyWithComa(bets[bet.id])}</span>
                            </button>
                        ) : null}
                        {statuses[bet.id]?.paid ? (
                            <span className='game-action-overlay__side-bet-paid'>
                                +{_.formatCurrencyWithComa(statuses[bet.id].paid)}
                            </span>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

SideBetsModule.propTypes = {
    bets: PropTypes.objectOf(PropTypes.number).isRequired,
    disabled: PropTypes.bool,
    isFocus: PropTypes.bool,
    isTable: PropTypes.bool,
    showHeading: PropTypes.bool,
    statuses: PropTypes.objectOf(PropTypes.shape({
        unqualified: PropTypes.bool,
        paid: PropTypes.number,
    })),
    unitAmount: PropTypes.number,
    onAdd: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

SideBetsModule.defaultProps = {
    disabled: false,
    isFocus: false,
    isTable: false,
    showHeading: false,
    statuses: {},
    unitAmount: SIDE_BET_STEP,
};

function ConsoleCard({ card, muted = false }) {
    if (!card) return null;
    const sSuit = String(card.eSuit || '').toLowerCase();
    const sSuitKey = sSuit?.[0];
    const sSuitImage = {
        h: heartImage,
        d: diamondImage,
        c: clubImage,
        s: spadeImage,
    }[sSuitKey] || spadeImage;
    const sSuitSymbol = {
        h: '♥',
        d: '♦',
        c: '♣',
        s: '♠',
    }[sSuit?.[0]] || '';
    const sLabel = card.nLabel === 1 ? 'A'
        : card.nLabel === 11 ? 'J'
            : card.nLabel === 12 ? 'Q'
                : card.nLabel === 13 ? 'K'
                    : String(card.nLabel || '');
    const bRed = sSuitKey === 'h' || sSuitKey === 'd';

    return (
        <span className={`game-action-overlay__console-card${bRed ? ' is-red' : ''}${muted ? ' is-muted' : ''}`}>
            <img className='game-action-overlay__console-card-face' src={cardFrontImage} alt='' draggable='false' />
            <img className='game-action-overlay__console-card-corner-suit' src={sSuitImage} alt={sSuitSymbol} draggable='false' />
            <strong className='game-action-overlay__console-card-rank-center'>{sLabel}</strong>
        </span>
    );
}

ConsoleCard.propTypes = {
    card: PropTypes.shape({
        eSuit: PropTypes.string,
        nLabel: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    muted: PropTypes.bool,
};

ConsoleCard.defaultProps = {
    card: null,
    muted: false,
};

function ConsoleCards({ handCards, communityCards, score }) {
    const bHasCards = handCards.length || communityCards.length;

    return (
        <div className={`game-action-overlay__console-cards${bHasCards ? ' has-cards' : ''}`} aria-label='Your cards'>
            <div className='game-action-overlay__console-card-group'>
                {handCards.length ? handCards.map((card) => <ConsoleCard key={card._id || `hand-${card.eSuit}-${card.nLabel}`} card={card} />) : (
                    <span className='game-action-overlay__console-card-empty'>Your cards</span>
                )}
            </div>
            {communityCards.length ? (
                <>
                    <span className='game-action-overlay__console-card-plus'>+</span>
                    <div className='game-action-overlay__console-card-group'>
                        {communityCards.map((card) => (
                            <ConsoleCard key={card._id || `community-${card.eSuit}-${card.nLabel}`} card={card} muted />
                        ))}
                    </div>
                </>
            ) : null}
            {bHasCards ? (
                <span className='game-action-overlay__console-card-total'>
                    {Number(score) || 0}
                </span>
            ) : null}
        </div>
    );
}

ConsoleCards.propTypes = {
    handCards: PropTypes.arrayOf(PropTypes.object).isRequired,
    communityCards: PropTypes.arrayOf(PropTypes.object).isRequired,
    score: PropTypes.number.isRequired,
};

function hasCardRun(cards = [], nMinimumLength = 3) {
    const ranks = [...new Set(cards.map((card) => {
        const nLabel = Number(card?.nLabel);
        if (nLabel === 1) return 14;
        return nLabel;
    }).filter((rank) => rank > 0))].sort((a, b) => a - b);
    if (ranks.includes(14)) ranks.unshift(1);

    let nRun = 1;
    for (let index = 1; index < ranks.length; index += 1) {
        if (ranks[index] === ranks[index - 1] + 1) {
            nRun += 1;
            if (nRun >= nMinimumLength) return true;
        } else if (ranks[index] !== ranks[index - 1]) {
            nRun = 1;
        }
    }

    return false;
}

function getSideBetStatuses(handCards = [], communityCards = [], sideBetLive = true) {
    const cards = [...handCards, ...communityCards];
    const nRemainingCommunityCards = Math.max(0, 5 - communityCards.length);
    const nScore = cards.reduce((sum, card) => sum + (Number(card?.nValue) || 0), 0);
    const suitCounts = cards.reduce((accumulator, card) => {
        const suit = String(card?.eSuit || '').toLowerCase();
        if (!suit) return accumulator;
        accumulator[suit] = (accumulator[suit] || 0) + 1;
        return accumulator;
    }, {});
    const nMaxSuitCount = Math.max(0, ...Object.values(suitCounts));

    return {
        'twenty-one': {
            unqualified: cards.length > 0 && (nScore > 21 || (communityCards.length >= 5 && nScore !== 21)),
        },
        flush: {
            unqualified: cards.length < 3 || (!sideBetLive && nMaxSuitCount < 3) || (sideBetLive && nMaxSuitCount + nRemainingCommunityCards < 3),
        },
        straight: {
            unqualified: cards.length < 3 || (!sideBetLive && !hasCardRun(cards, 3)) || (sideBetLive && communityCards.length >= 5 && !hasCardRun(cards, 3)),
        },
    };
}

function normalizeSideBetPayouts(detail = {}) {
    const source = detail?.payouts && typeof detail.payouts === 'object' ? detail.payouts : {};
    const payouts = SIDE_BET_OPTIONS.reduce((accumulator, option) => {
        const rawValue = source[option.id] ?? source[option.label] ?? source[option.variant];
        const nValue = Number(rawValue);
        if (Number.isFinite(nValue) && nValue > 0) accumulator[option.id] = nValue;
        return accumulator;
    }, {});
    const nWinningAmount = Number(detail?.nWinningAmount);

    return {
        payouts,
        total: Number.isFinite(nWinningAmount) && nWinningAmount > 0
            ? nWinningAmount
            : Object.values(payouts).reduce((sum, amount) => sum + amount, 0),
        message: String(detail?.message || '').trim(),
        expiresAt: Date.now() + 3400,
    };
}

function SideBetInfoDialog({ visible, onClose }) {
    if (!visible) return null;

    return (
        <div className='game-action-overlay__side-bet-info-dialog' role='dialog' aria-modal='true' aria-label='Side bet payouts'>
            <div className='game-action-overlay__side-bet-info-panel'>
                <button type='button' className='game-action-overlay__side-bet-info-close' onClick={onClose} aria-label='Close side bet payouts'>
                    ×
                </button>
                <strong>Side Bet Payouts</strong>
                <div className='game-action-overlay__side-bet-info-list'>
                    {SIDE_BET_INFO.map((item) => (
                        <div key={item.title}>
                            <span>{item.title}</span>
                            <p>{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

SideBetInfoDialog.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

const BUTTON_CLASS_BY_VARIANT = {
    primary: 'guest-entry-btn',
    secondary: 'about-entry-btn',
};

// eslint-disable-next-line react/prop-types
function GameActionOverlay({ isPaused = false }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [overlayState, setOverlayState] = useState(() => createHiddenGameActionOverlayState());
    const [sideBets, setSideBets] = useState(createInitialSideBets);
    const [sideBetWindow, setSideBetWindow] = useState({
        visible: false,
        dismissed: false,
        endsAt: 0,
    });
    const [sideBetPayout, setSideBetPayout] = useState({ payouts: {}, total: 0, message: '', expiresAt: 0 });
    const [consoleCards, setConsoleCards] = useState({ hand: [], community: [], sideBetCommunity: [], sideBetLive: true, score: 0 });
    const [turnTimer, setTurnTimer] = useState({ active: false, endsAt: 0, totalMs: 0 });
    const [sideBetUnitAmount, setSideBetUnitAmount] = useState(SIDE_BET_STEP);
    const [bShowSideBetInfo, setShowSideBetInfo] = useState(false);
    const [clockNow, setClockNow] = useState(() => Date.now());
    const [consoleWin, setConsoleWin] = useState({ visible: false, amount: 0, token: 0 });
    const [consoleBust, setConsoleBust] = useState({ active: false, token: 0 });
    const [cardMotion, setCardMotion] = useState({ mode: '', token: 0 });
    const [displayedConsoleCards, setDisplayedConsoleCards] = useState(consoleCards);
    const previousCardSignatureRef = useRef('');
    const { data: profileData } = useQuery('profileData', getProfile, {
        select: (data) => data?.data?.data,
        refetchOnWindowFocus: false,
    });
    const totalSideBets = Object.values(sideBets).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
    const sideBetStatuses = useMemo(
        () => {
            const statuses = getSideBetStatuses(consoleCards.hand, consoleCards.sideBetCommunity, consoleCards.sideBetLive);
            Object.entries(sideBetPayout.payouts || {}).forEach(([id, amount]) => {
                statuses[id] = {
                    ...(statuses[id] || {}),
                    paid: Number(amount) || 0,
                };
            });
            return statuses;
        },
        [consoleCards.hand, consoleCards.sideBetCommunity, consoleCards.sideBetLive, sideBetPayout.payouts]
    );
    const sideBetSecondsRemaining = sideBetWindow.endsAt
        ? Math.max(0, Math.ceil((sideBetWindow.endsAt - clockNow) / 1000))
        : 0;
    const bSideBetWindowOpen = sideBetWindow.visible && sideBetSecondsRemaining > 0;
    const turnTimerRemainingMs = turnTimer.active && turnTimer.endsAt
        ? Math.max(0, turnTimer.endsAt - clockNow)
        : 0;
    const turnTimerProgress = turnTimer.active && turnTimer.totalMs > 0
        ? Math.max(0, Math.min(1, turnTimerRemainingMs / turnTimer.totalMs))
        : 0;
    const consoleAvatarStyle = {
        '--turn-progress': `${turnTimerProgress * 100}%`,
    };

    const addSideBet = (id) => {
        if (isPaused || !bSideBetWindowOpen) return;
        setSideBets((currentBets) => {
            const nextAmount = Math.max(0, Math.min(SIDE_BET_MAX, (Number(currentBets[id]) || 0) + sideBetUnitAmount));
            return {
                ...currentBets,
                [id]: nextAmount,
            };
        });
    };

    const clearSideBet = (id) => {
        if (isPaused || !bSideBetWindowOpen) return;
        setSideBets((currentBets) => ({
            ...currentBets,
            [id]: 0,
        }));
    };

    const clearAllSideBets = () => {
        if (isPaused || !bSideBetWindowOpen) return;
        setSideBets(createInitialSideBets());
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SIDE_BETS_CHANGE, {
            detail: {
                bets: sideBets,
                total: totalSideBets,
            },
        }));
    }, [sideBets, totalSideBets]);

    useEffect(() => {
        const handleServerSideBets = (event) => {
            const nextBets = event?.detail?.bets;
            if (!nextBets || typeof nextBets !== 'object') return;
            setSideBets({
                ...createInitialSideBets(),
                ...nextBets,
            });
            const payout = normalizeSideBetPayouts(event?.detail);
            if (payout.total > 0) setSideBetPayout(payout);
        };
        const handleConsoleCards = (event) => {
            setConsoleCards({
                hand: Array.isArray(event?.detail?.hand) ? event.detail.hand : [],
                community: Array.isArray(event?.detail?.community) ? event.detail.community : [],
                sideBetCommunity: Array.isArray(event?.detail?.sideBetCommunity) ? event.detail.sideBetCommunity : [],
                sideBetLive: event?.detail?.sideBetLive !== false,
                score: Number(event?.detail?.score) || 0,
            });
        };

        window.addEventListener(GAME_BROWSER_EVENTS.SIDE_BETS_SERVER_STATE, handleServerSideBets);
        window.addEventListener(GAME_BROWSER_EVENTS.CONSOLE_CARDS, handleConsoleCards);
        return () => {
            window.removeEventListener(GAME_BROWSER_EVENTS.SIDE_BETS_SERVER_STATE, handleServerSideBets);
            window.removeEventListener(GAME_BROWSER_EVENTS.CONSOLE_CARDS, handleConsoleCards);
        };
    }, []);

    useEffect(() => {
        const handleSideBetPayout = (event) => {
            const payout = normalizeSideBetPayouts(event?.detail);
            if (payout.total > 0) setSideBetPayout(payout);
        };

        window.addEventListener(GAME_BROWSER_EVENTS.SIDE_BET_PAYOUT, handleSideBetPayout);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.SIDE_BET_PAYOUT, handleSideBetPayout);
    }, []);

    useEffect(() => {
        const handleSideBetWindow = (event) => {
            const bVisible = Boolean(event?.detail?.visible);
            const nSeconds = Math.max(0, Number(event?.detail?.seconds) || 0);
            setSideBetWindow({
                visible: bVisible,
                dismissed: false,
                endsAt: bVisible && nSeconds ? Date.now() + (nSeconds * 1000) : 0,
            });
        };

        window.addEventListener(GAME_BROWSER_EVENTS.SIDE_BET_WINDOW, handleSideBetWindow);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.SIDE_BET_WINDOW, handleSideBetWindow);
    }, []);

    useEffect(() => {
        const handleSideBetConfig = (event) => {
            const nBigBlind = Number(event?.detail?.bigBlind);
            if (Number.isFinite(nBigBlind) && nBigBlind > 0) {
                setSideBetUnitAmount(nBigBlind);
            }
        };

        window.addEventListener(GAME_BROWSER_EVENTS.SIDE_BET_CONFIG, handleSideBetConfig);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.SIDE_BET_CONFIG, handleSideBetConfig);
    }, []);

    useEffect(() => {
        const handleConsoleTimer = (event) => {
            const bActive = Boolean(event?.detail?.active);
            const nRemainingMs = Math.max(0, Number(event?.detail?.remainingMs) || 0);
            const nTotalMs = Math.max(0, Number(event?.detail?.totalMs) || 0);
            setTurnTimer({
                active: bActive && nRemainingMs > 0 && nTotalMs > 0,
                endsAt: bActive && nRemainingMs > 0 ? Date.now() + nRemainingMs : 0,
                totalMs: nTotalMs,
            });
        };

        window.addEventListener(GAME_BROWSER_EVENTS.CONSOLE_TURN_TIMER, handleConsoleTimer);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.CONSOLE_TURN_TIMER, handleConsoleTimer);
    }, []);

    useEffect(() => {
        if (!sideBetWindow.visible || !sideBetWindow.endsAt) return undefined;
        if (clockNow < sideBetWindow.endsAt) return undefined;
        setSideBetWindow((currentWindow) => ({
            ...currentWindow,
            visible: false,
            dismissed: false,
            endsAt: 0,
        }));
        return undefined;
    }, [clockNow, sideBetWindow.endsAt, sideBetWindow.visible]);

    useEffect(() => {
        if (!sideBetPayout.expiresAt) return undefined;
        if (clockNow < sideBetPayout.expiresAt) return undefined;
        setSideBetPayout({ payouts: {}, total: 0, message: '', expiresAt: 0 });
        return undefined;
    }, [clockNow, sideBetPayout.expiresAt]);

    useEffect(() => {
        const bNeedsClock = (sideBetWindow.visible && sideBetWindow.endsAt > clockNow)
            || (turnTimer.active && turnTimer.endsAt > clockNow)
            || (sideBetPayout.expiresAt > clockNow);
        if (!bNeedsClock) return undefined;
        const timer = window.setInterval(() => setClockNow(Date.now()), 250);

        return () => window.clearInterval(timer);
    }, [clockNow, sideBetPayout.expiresAt, sideBetWindow.endsAt, sideBetWindow.visible, turnTimer.active, turnTimer.endsAt]);

    useEffect(() => {
        if (!turnTimer.active || !turnTimer.endsAt || clockNow < turnTimer.endsAt) return undefined;
        setTurnTimer((currentTimer) => ({ ...currentTimer, active: false, endsAt: 0 }));
        return undefined;
    }, [clockNow, turnTimer.active, turnTimer.endsAt]);

    useEffect(() => {
        const handleConsoleWin = (event) => {
            const nAmount = Math.max(0, Number(event?.detail?.amount) || 0);
            const nToken = Date.now();
            setConsoleWin({ visible: true, amount: nAmount, token: nToken });
            window.setTimeout(() => {
                setConsoleWin((current) => (current.token === nToken ? { visible: false, amount: 0, token: 0 } : current));
            }, 2400);
        };

        window.addEventListener(GAME_BROWSER_EVENTS.CONSOLE_WIN, handleConsoleWin);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.CONSOLE_WIN, handleConsoleWin);
    }, []);

    useEffect(() => {
        const handleConsoleBust = () => {
            const nToken = Date.now();
            setConsoleBust({ active: true, token: nToken });
            window.setTimeout(() => {
                setConsoleBust((current) => (current.token === nToken ? { active: false, token: 0 } : current));
            }, 1300);
        };

        window.addEventListener(GAME_BROWSER_EVENTS.CONSOLE_BUST, handleConsoleBust);
        return () => window.removeEventListener(GAME_BROWSER_EVENTS.CONSOLE_BUST, handleConsoleBust);
    }, []);

    useEffect(() => {
        const handleStateUpdate = (event) => {
            setOverlayState({
                ...createHiddenGameActionOverlayState(),
                ...(event?.detail || {}),
            });
        };

        const handleNavigate = (event) => {
            const sPath = event?.detail?.path;
            if (sPath) navigate(sPath);
        };

        const handleProfileRefresh = () => {
            queryClient.invalidateQueries('profileData');
            queryClient.invalidateQueries('layout-profile');
        };

        window.addEventListener(GAME_ACTION_OVERLAY_STATE_EVENT, handleStateUpdate);
        window.addEventListener(GAME_BROWSER_EVENTS.NAVIGATE, handleNavigate);
        window.addEventListener(GAME_BROWSER_EVENTS.PROFILE_REFRESH, handleProfileRefresh);
        return () => {
            window.removeEventListener(GAME_ACTION_OVERLAY_STATE_EVENT, handleStateUpdate);
            window.removeEventListener(GAME_BROWSER_EVENTS.NAVIGATE, handleNavigate);
            window.removeEventListener(GAME_BROWSER_EVENTS.PROFILE_REFRESH, handleProfileRefresh);
        };
    }, [navigate, queryClient]);

    const rows = useMemo(() => Array.isArray(overlayState.rows) ? overlayState.rows : [], [overlayState.rows]);
    const hasButtons = useMemo(() => rows.some((row) => {
        const rowButtons = Array.isArray(row?.buttons) ? row.buttons.filter(Boolean) : [];
        return rowButtons.length > 0;
    }), [rows]);
    const hasMessage = Boolean(overlayState.message);
    const bankrollAmount = typeof profileData?.nChips === 'number' ? _.formatCurrency(profileData.nChips) : '--';
    const tableBankrollAmount = Number.isFinite(Number(overlayState.tableBankroll))
        ? _.formatCurrency(Number(overlayState.tableBankroll))
        : '--';
    const sConsoleName = profileData?.sUserName || 'Player';
    const sConsoleAvatar = getAvatarImageSrc(profileData?.sAvatar, sConsoleName);
    const isVisible = Boolean(overlayState.visible);
    const hasLiveConsoleCards = Boolean(consoleCards.hand.length || consoleCards.community.length);
    const hasDisplayedConsoleCards = Boolean(displayedConsoleCards.hand.length || displayedConsoleCards.community.length);
    const sCardSignature = [
        ...consoleCards.hand.map((card) => card?._id || `${card?.eSuit}-${card?.nLabel}`),
        '|',
        ...consoleCards.community.map((card) => card?._id || `${card?.eSuit}-${card?.nLabel}`),
    ].join(',');
    const sCardMotionClass = cardMotion.mode ? ` is-${cardMotion.mode}` : '';

    useEffect(() => {
        const previousSignature = previousCardSignatureRef.current;
        if (previousSignature === sCardSignature) return;

        const hadCards = Boolean(previousSignature && previousSignature !== '|');
        const hasCards = Boolean(sCardSignature && sCardSignature !== '|');
        previousCardSignatureRef.current = sCardSignature;

        if (hasCards) {
            setDisplayedConsoleCards(consoleCards);
            setCardMotion({ mode: 'dealing', token: Date.now() });
        } else if (hadCards) {
            setCardMotion({ mode: 'clearing', token: Date.now() });
        }
    }, [consoleCards, sCardSignature]);

    useEffect(() => {
        if (!cardMotion.mode) return undefined;
        const nToken = cardMotion.token;
        const timeout = window.setTimeout(() => {
            setCardMotion((current) => (current.token === nToken ? { mode: '', token: 0 } : current));
            if (cardMotion.mode === 'clearing') {
                setDisplayedConsoleCards(consoleCards);
            }
        }, cardMotion.mode === 'clearing' ? 520 : 680);
        return () => window.clearTimeout(timeout);
    }, [cardMotion.mode, cardMotion.token, consoleCards]);

    return (
        <>
            <div className='game-stage-utility' aria-label='Game utility controls'>
                <SoundToggle />
                <ExitUtilityButton />
            </div>
            <div className={`game-action-overlay ${(isVisible || hasLiveConsoleCards || hasDisplayedConsoleCards) ? 'is-visible' : ''}`.trim()}>
            <div className='game-action-overlay__shell'>
                {hasMessage ? (
                    <div className='game-action-overlay__message'>
                        {overlayState.message}
                    </div>
                ) : null}
                <div
                    className={`game-action-overlay__table-side-bets${bSideBetWindowOpen ? ' is-open' : ''}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type='button'
                        className='game-action-overlay__side-bet-info game-action-overlay__side-bet-info--table'
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setShowSideBetInfo(true);
                        }}
                        aria-label='Side bet payout information'
                    >
                        i
                    </button>
                    <SideBetsModule
                        bets={sideBets}
                        disabled={isPaused || !bSideBetWindowOpen}
                        isTable
                        showHeading={bSideBetWindowOpen}
                        statuses={bSideBetWindowOpen ? {} : sideBetStatuses}
                        unitAmount={sideBetUnitAmount}
                        onAdd={addSideBet}
                        onClear={clearSideBet}
                    />
                    {sideBetPayout.total > 0 ? (
                        <div className='game-action-overlay__side-bet-payout' aria-live='polite'>
                            <span>{sideBetPayout.message || 'Side Bet Paid'}</span>
                            <strong>+{_.formatCurrencyWithComa(sideBetPayout.total)}</strong>
                        </div>
                    ) : null}
                    <div className='game-action-overlay__table-side-bets-footer'>
                        <span>{bSideBetWindowOpen ? `${sideBetSecondsRemaining}s` : `+${_.formatCurrencyWithComa(sideBetUnitAmount)}`}</span>
                        <button
                            type='button'
                            className='game-action-overlay__side-bet-clear'
                            disabled={isPaused || !bSideBetWindowOpen || !totalSideBets}
                            onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                clearAllSideBets();
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
                {hasDisplayedConsoleCards ? (
                    <div className={`game-action-overlay__floating-console-cards${sCardMotionClass}`}>
                        <ConsoleCards
                            handCards={displayedConsoleCards.hand}
                            communityCards={displayedConsoleCards.community}
                            score={displayedConsoleCards.score}
                        />
                    </div>
                ) : null}
                <div className='game-action-overlay__tray'>
                    {hasButtons ? (
                        <div className={`game-action-overlay__rows game-action-overlay__rows--interactive${DEBUG_CONSOLE_LAYOUT ? ' is-debug-layout' : ''}`}>
                            {rows.map((row, rowIndex) => {
                                const rowButtons = Array.isArray(row?.buttons) ? row.buttons.filter(Boolean) : [];
                                if (!rowButtons.length) return null;

                                return (
                                    <div
                                        key={row.id || `row-${rowIndex}`}
                                        className={`game-action-overlay__row auth-intro-actions ${row.className || ''}`.trim()}
                                    >
                                        {rowButtons.map((button) => {
                                            const variantClass = BUTTON_CLASS_BY_VARIANT[button.variant] || BUTTON_CLASS_BY_VARIANT.secondary;
                                            const widthClass = button.widthClass || '';

                                            return (
                                                <Button
                                                    key={button.key}
                                                    type='button'
                                                    className={`${variantClass} ${widthClass}`.trim()}
                                                    data-game-action-key={button.key}
                                                    disabled={isPaused || button.disabled}
                                                    onClick={() => emitGameActionOverlayCommand(button.key, {
                                                        amount: button.amount,
                                                    })}
                                                >
                                                    {button.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                    <div
                        className={`game-action-overlay__console-shell${DEBUG_CONSOLE_LAYOUT ? ' is-debug-layout' : ''}${consoleWin.visible ? ' is-winning' : ''}${turnTimer.active ? ' is-my-turn' : ''}${consoleBust.active ? ' is-bust' : ''}`}
                        style={CONSOLE_LAYOUT_STYLE}
                    >
                        {consoleWin.visible ? (
                            <div className='game-action-overlay__console-win' aria-live='polite'>
                                <span className='game-action-overlay__console-win-crown'>♛</span>
                                <strong>+{_.formatCurrencyWithComa(consoleWin.amount)}</strong>
                            </div>
                        ) : null}
                        <div className='game-action-overlay__console-col game-action-overlay__console-col--left'>
                            <div className={`game-action-overlay__console-avatar${turnTimer.active ? ' is-timing' : ''}`} style={consoleAvatarStyle}>
                                {sConsoleAvatar ? (
                                    <img src={sConsoleAvatar} alt='' draggable='false' />
                                ) : (
                                    <span>{String(sConsoleName).slice(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div className='game-action-overlay__console-bankroll'>
                                <span className='game-action-overlay__console-name'>{_.appendSuffix(sConsoleName, 14)}</span>
                                <span>Current</span>
                                <strong>{bankrollAmount}</strong>
                            </div>
                        </div>
                        <div className='game-action-overlay__console-col game-action-overlay__console-col--center' aria-hidden='true' />
                        <div className='game-action-overlay__console-col game-action-overlay__console-col--right'>
                            <div className='game-action-overlay__table-bankroll'>
                                <span>Table</span>
                                <strong>{tableBankrollAmount}</strong>
                            </div>
                            <EmojiPicker />
                            {/*
                                <span className='game-action-overlay__side-bet-callout'>
                                    Place a bet now for the next hand
                                    <button
                                        type='button'
                                        className='game-action-overlay__side-bet-callout-close'
                                        aria-label='Hide side bet reminder'
                                    >
                                        ×
                                    </button>
                                </span>
                            */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <SideBetInfoDialog
            visible={bShowSideBetInfo}
            onClose={() => setShowSideBetInfo(false)}
        />

        </>
    );
}

export default GameActionOverlay;
