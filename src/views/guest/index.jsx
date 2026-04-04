import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { joinGuestTable } from 'query/guest.query';
import guestWelcome from '../../assets/images/bg/master_welcome.png';
import { getGuestDeviceId, loginGuestWithDeviceId, resetGuestDeviceId } from './session';

const LOBBY_POINTS = [
    {
        title: 'Instant Guest Seat',
        copy: 'Jump into a live game immediately with no signup required.',
    },
    {
        title: '10K Free Chips',
        copy: 'Start with a ready stack so you can learn the flow risk free.',
    },
    {
        title: 'Guided Tutorial',
        copy: 'See how totals, community cards, and standing work in minutes.',
    },
];

function GuestLanding() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const guestDeviceId = useMemo(() => getGuestDeviceId(), []);

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
                <div className='guest-landing__welcome-shell'>
                    <div className='guest-landing__welcome-stage-column'>
                        <div className='guest-landing__welcome-stage'>
                            <div className='guest-landing__welcome-glow' aria-hidden='true' />
                            <img className='guest-landing__welcome-character' src={guestWelcome} alt='21 Holdem guest welcome character' />
                        </div>

                        <div className='guest-landing__welcome-stage-actions'>
                            <Button className='guest-landing__secondary-cta' onClick={() => navigate('/register')} disabled={isLoading}>
                                Sign Up
                            </Button>
                        </div>
                    </div>

                    <div className='guest-landing__welcome-copy guest-landing__welcome-copy--lobby'>
                        <span className='guest-landing__eyebrow'>Guest Lobby</span>
                        <h1>Welcome To 21 Hold&apos;em</h1>
                        <p>
                            Step into the same blue-table atmosphere as the main lobby, learn the format fast, and
                            take a guest seat whenever you&apos;re ready.
                        </p>

                        <ul className='guest-landing__lobby-points'>
                            {LOBBY_POINTS.map(point => (
                                <li key={point.title}>
                                    <strong>{point.title}</strong>
                                    <span>{point.copy}</span>
                                </li>
                            ))}
                        </ul>

                        {error ? (
                            <div className='guest-landing__status guest-landing__status--error'>{error}</div>
                        ) : null}

                        <div className='guest-landing__cta-row guest-landing__cta-row--lobby'>
                            <Button className='guest-landing__primary-cta' onClick={handleEnterGuestTable} disabled={isLoading}>
                                {isLoading ? 'Opening Table...' : 'Take A Guest Seat'}
                            </Button>
                            <Button className='guest-landing__tutorial-cta' onClick={() => navigate('/guest/tutorial')} disabled={isLoading}>
                                Open Tutorial
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
