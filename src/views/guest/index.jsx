import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { joinGuestTable } from 'query/guest.query';
import AppWordmark from 'shared/components/AppWordmark';
import dailyRewardsLobbyBackground from '../../assets/images/bg/daily_rewards_bg.png';
import liveTablesImage from '../../assets/images/bg/live_tables.png';
import privateTableImage from '../../assets/images/bg/private_table.png';
import profileCoverImage from '../../assets/images/player-profile/highlighted_profile_cover.png';
import profileAvatarImage from '../../assets/images/player-profile/profile_picture.png';
import dailyRewardsLightsVideo from '../../assets/videos/daily_rewards_lights.mp4';
import { getGuestDeviceId, loginGuestWithDeviceId, resetGuestDeviceId } from './session';

const GUEST_PREVIEW_TABS = [
    {
        id: 'guest-live-tables',
        label: 'Live Tables',
        title: 'No account? No problem!',
        image: liveTablesImage,
        copy: 'Play Blackjack with a poker twist.\nRaise, bet, and bluff to beat your opponents.',
        points: ['Start with 10,000 FREE chips', 'Full access — no restrictions', 'Play against real players worldwide'],
    },
    {
        id: 'guest-missions',
        label: 'Daily Rewards',
        title: 'DAILY REWARDS',
        image: dailyRewardsLobbyBackground,
        video: dailyRewardsLightsVideo,
        tabStyle: {
            '--guest-preview-veil-bg': 'linear-gradient(180deg, rgba(5, 14, 25, 0.02) 0%, rgba(5, 14, 25, 0.16) 100%)',
            '--guest-preview-copy-bg': 'linear-gradient(180deg, rgba(32, 80, 124, 0.46) 0%, rgba(10, 28, 46, 0.62) 100%)',
            '--guest-preview-copy-border': 'rgba(215, 238, 255, 0.2)',
        },
        copy: 'Recieve daily chip bonuses and otherr rewards.',
        points: ['Daily claim tracking', 'Mission and streak progress', 'Reward history and timing'],
    },
    {
        id: 'guest-private-table',
        label: 'Private Table',
        title: 'Private rooms need a registered account',
        image: privateTableImage,
        copy: 'To access these features, you need an account. Create a profile to host rooms, share codes, and control who joins your table.',
        points: ['Create invite-only rooms', 'Share and manage room codes', 'Keep sessions limited to your group'],
    },
    {
        id: 'guest-player-profile',
        label: 'Profile',
        title: 'Your player profile starts after signup',
        image: liveTablesImage,
        copy: 'To access these features, you need an account. Your balance, stats, and saved identity all sit in the profile area once you register.',
        points: ['Persistent chip balance', 'Results and win tracking', 'Avatar and account identity'],
    },
];

function GuestLanding() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sActiveTab, setActiveTab] = useState(GUEST_PREVIEW_TABS[0].id);
    const guestDeviceId = useMemo(() => getGuestDeviceId(), []);
    const oActiveTab = useMemo(
        () => GUEST_PREVIEW_TABS.find((item) => item.id === sActiveTab) || GUEST_PREVIEW_TABS[0],
        [sActiveTab]
    );

    const openGuestBoard = async (sDeviceId) => {
        const sAuthToken = await loginGuestWithDeviceId(sDeviceId);
        const joinResponse = await joinGuestTable({ sAuthToken });
        const iBoardId = joinResponse?.data?.data?.iBoardId;
        if (!iBoardId) throw new Error('Guest board was not created');

        navigate('/guest/game', {
            state: {
                sAuthToken,
                iBoardId,
                fallbackPath: '/guest',
                isGuest: true,
            },
        });
    };

    const handleEnterGuestTable = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        try {
            await openGuestBoard(guestDeviceId);
        } catch (requestError) {
            const responseMessage = requestError?.response?.data?.message || '';
            const shouldRetryWithFreshGuest =
                /maximum limit of joining boards/i.test(responseMessage) ||
                /already in this game on another tab/i.test(responseMessage);

            if (shouldRetryWithFreshGuest) {
                try {
                    const nextGuestDeviceId = resetGuestDeviceId();
                    await openGuestBoard(nextGuestDeviceId);
                    return;
                } catch (retryError) {
                    const retryMessage =
                        retryError?.response?.data?.message || retryError?.message || 'Unable to open guest table';
                    setError(retryMessage);
                    return;
                }
            }

            const message = requestError?.response?.data?.message || requestError?.message || 'Unable to open guest table';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTabKeyDown = (event, sCurrentTabId) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();

        const nCurrentIndex = GUEST_PREVIEW_TABS.findIndex((item) => item.id === sCurrentTabId);
        if (nCurrentIndex === -1) return;

        let nNextIndex = nCurrentIndex;

        if (event.key === 'Home') nNextIndex = 0;
        if (event.key === 'End') nNextIndex = GUEST_PREVIEW_TABS.length - 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nNextIndex = (nCurrentIndex + 1) % GUEST_PREVIEW_TABS.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nNextIndex = (nCurrentIndex - 1 + GUEST_PREVIEW_TABS.length) % GUEST_PREVIEW_TABS.length;

        const sNextTabId = GUEST_PREVIEW_TABS[nNextIndex]?.id;
        if (!sNextTabId) return;

        setActiveTab(sNextTabId);
        if (typeof document !== 'undefined') {
            window.requestAnimationFrame(() => document.getElementById(`${sNextTabId}-tab`)?.focus());
        }
    };

    return (
        <div className='guest-landing guest-landing--lobby guest-landing--themed'>
            <div className='guest-landing__ambient-grid' aria-hidden='true' />
            <div className='guest-landing__lobby-atmosphere' aria-hidden='true'>
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--one' />
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--two' />
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--three' />
                <span className='guest-landing__lobby-beam' />
            </div>

            <section className='guest-landing__hero guest-landing__hero--lobby'>
                <div className='guest-landing__welcome-shell guest-landing__welcome-shell--lobby'>
                    <div className='guest-landing__welcome-copy guest-landing__welcome-copy--lobby'>
                        <div className='guest-landing__page-brand' aria-hidden='true'>
                            <AppWordmark className='guest-landing__page-brand-mark' />
                        </div>

                        <div className='guest-landing__heading-row'>
                            <h1>Guest Lobby</h1>
                            <Button className='guest-landing__secondary-cta guest-landing__secondary-cta--heading' onClick={() => navigate('/login')} disabled={isLoading}>
                                Sign-in/Register
                            </Button>
                        </div>

                        <section className='guest-landing__preview-window' aria-label='Guest lobby preview'>
                            <div className='guest-landing__preview-tabs' role='tablist' aria-label='Guest lobby sections'>
                                {GUEST_PREVIEW_TABS.map((item) => (
                                    <button
                                        key={item.id}
                                        id={`${item.id}-tab`}
                                        type='button'
                                        role='tab'
                                        aria-selected={sActiveTab === item.id}
                                        aria-controls={`${item.id}-panel`}
                                        tabIndex={sActiveTab === item.id ? 0 : -1}
                                        className={`guest-landing__preview-tab${sActiveTab === item.id ? ' is-active' : ''}`}
                                        style={{ '--guest-preview-image': `url("${item.image}")`, ...(item.tabStyle || {}) }}
                                        onClick={() => setActiveTab(item.id)}
                                        onKeyDown={(event) => handleTabKeyDown(event, item.id)}
                                    >
                                        <span className='guest-landing__preview-tab-eyebrow' aria-hidden='true' />
                                        <span className='guest-landing__preview-tab-label'>
                                            <span className='guest-landing__preview-tab-title'>{item.label}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div id={`${oActiveTab.id}-panel`} className='guest-landing__preview-panel' role='tabpanel' aria-labelledby={`${oActiveTab.id}-tab`}>
                                {oActiveTab.id === 'guest-player-profile' ? (
                                    <div className='guest-landing__profile-preview' aria-hidden='true'>
                                        <div className='guest-landing__profile-preview-card' style={{ '--guest-profile-preview-image': `url("${profileCoverImage}")` }}>
                                            <div className='guest-landing__profile-preview-avatar'>
                                                <img src={profileAvatarImage} alt='' />
                                            </div>
                                            <div className='guest-landing__profile-preview-copy'>
                                                <span className='guest-landing__profile-preview-label'>Player Profile</span>
                                                <strong>Guest</strong>
                                                <span className='guest-landing__profile-preview-meta'>Starter bankroll and stats unlock after signup</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`guest-landing__preview-media${oActiveTab.id === 'guest-missions' ? ' guest-landing__preview-media--daily-rewards' : ''}${oActiveTab.id === 'guest-live-tables' ? ' guest-landing__preview-media--guest-table' : ''}`}
                                        aria-hidden='true'
                                    >
                                        {oActiveTab.id === 'guest-live-tables' ? (
                                            <span className='guest-landing__preview-ribbon'>Instant Play - No Sign-up!</span>
                                        ) : null}
                                        {oActiveTab.id === 'guest-missions' || oActiveTab.id === 'guest-private-table' ? (
                                            <span className='guest-landing__preview-ribbon guest-landing__preview-ribbon--lock'>SIGN-IN to unlock</span>
                                        ) : null}
                                        {oActiveTab.video ? (
                                            <video className='guest-landing__preview-media-video' autoPlay muted loop playsInline preload='auto'>
                                                <source src={oActiveTab.video} type='video/mp4' />
                                            </video>
                                        ) : null}
                                        <img src={oActiveTab.image} alt='' />
                                    </div>
                                )}

                                <div className='guest-landing__preview-copy'>
                                    <h2>{oActiveTab.title}</h2>
                                    <p>{oActiveTab.copy}</p>

                                    {oActiveTab.id === 'guest-live-tables' ? (
                                        <h3 className='guest-landing__preview-subheading'>Signup FREE and get</h3>
                                    ) : null}

                                    {oActiveTab.points.length ? (
                                        <ul className='guest-landing__preview-points'>
                                            {oActiveTab.points.map((point) => (
                                                <li key={point}>{point}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            </div>
                        </section>

                        {error ? (
                            <div className='guest-landing__status guest-landing__status--error'>{error}</div>
                        ) : null}

                        <div className='guest-landing__cta-row guest-landing__cta-row--lobby guest-landing__cta-row--lobby-bottom'>
                            <Button className='guest-landing__primary-cta' onClick={handleEnterGuestTable} disabled={isLoading}>
                                {isLoading ? 'Opening Table...' : 'Take A Seat'}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className='guest-landing__loading'>
                    <Spinner animation='border' />
                    <span>Opening your guest seat...</span>
                </div>
            ) : null}
        </div>
    );
}

export default GuestLanding;
