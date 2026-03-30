import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { guestLogin, joinGuestTable } from 'query/guest.query';
import guestWelcome from '../../assets/images/bg/guest_welcome.png';

const LOBBY_POINTS = [
    'Jump straight into a guest seat with no signup required.',
    'Open the tutorial for a quick walkthrough before you play.',
    'Learn how totals build toward 21 without going over.',
];

function getGuestDeviceId() {
    const storageKey = 'guest-device-id';
    const existingId = window.localStorage.getItem(storageKey);
    if (existingId) return existingId;

    const nextId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, nextId);
    return nextId;
}

function GuestLanding() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const guestDeviceId = useMemo(() => getGuestDeviceId(), []);

    const handleEnterGuestTable = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        try {
            const loginResponse = await guestLogin({ sDeviceId: guestDeviceId });
            const sAuthToken = loginResponse?.headers?.authorization || loginResponse?.data?.data?.sToken;
            if (!sAuthToken) throw new Error('Guest token was not returned');

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
        } catch (requestError) {
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
                    <div className='guest-landing__welcome-stage'>
                        <div className='guest-landing__welcome-glow' aria-hidden='true' />
                        <img className='guest-landing__welcome-character' src={guestWelcome} alt='21 Holdem guest welcome character' />
                        <div className='guest-landing__promo-badge guest-landing__promo-badge--chips' aria-hidden='true'>
                            <span className='guest-landing__promo-badge-kicker'>10K</span>
                            <strong>FREE CHIPS!</strong>
                        </div>
                        <div className='guest-landing__promo-badge guest-landing__promo-badge--bonuses' aria-hidden='true'>
                            <span className='guest-landing__promo-badge-kicker'>DAILY</span>
                            <strong>BONUSES</strong>
                        </div>
                    </div>

                    <ul className='guest-landing__lobby-points'>
                        {LOBBY_POINTS.map(point => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>

                    {error ? (
                        <div className='guest-landing__status guest-landing__status--error'>{error}</div>
                    ) : null}

                    <div className='guest-landing__scroll-cue' aria-hidden='true'>
                        <span className='guest-landing__scroll-cue-label'>Scroll</span>
                        <span className='guest-landing__scroll-cue-arrow' />
                    </div>

                    <div className='guest-landing__cta-row guest-landing__cta-row--lobby'>
                        <Button className='guest-landing__primary-cta' onClick={handleEnterGuestTable} disabled={isLoading}>
                            {isLoading ? 'Opening Table...' : 'Take A Guest Seat'}
                        </Button>
                        <Button className='guest-landing__tutorial-cta' onClick={() => navigate('/guest/tutorial')} disabled={isLoading}>
                            Open Tutorial
                        </Button>
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
