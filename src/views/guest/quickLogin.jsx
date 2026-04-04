import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { joinGuestTable } from 'query/guest.query';
import { getGuestDeviceId, loginGuestWithDeviceId } from './session';

function GuestQuickLogin() {
    const navigate = useNavigate();
    const guestDeviceId = useMemo(() => getGuestDeviceId(), []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuickGuestLogin = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        try {
            const sAuthToken = await loginGuestWithDeviceId(guestDeviceId);
            const joinResponse = await joinGuestTable({ sAuthToken });
            const iBoardId = joinResponse?.data?.data?.iBoardId;

            if (!iBoardId) throw new Error('Guest board was not created');

            navigate('/guest/game', {
                state: {
                    sAuthToken,
                    iBoardId,
                    fallbackPath: '/guest/login',
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
        <div className='guest-landing guest-landing--quick guest-landing--themed'>
            <div className='guest-landing__ambient-grid' aria-hidden='true' />
            <div className='guest-landing__lobby-atmosphere' aria-hidden='true'>
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--one' />
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--two' />
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--three' />
                <span className='guest-landing__lobby-beam' />
            </div>

            <section className='guest-landing__hero guest-landing__hero--quick'>
                <div className='guest-landing__quick-shell'>
                    <div className='guest-landing__quick-card'>
                        <div className='guest-landing__eyebrow'>Quick Guest Login</div>
                        <h1>Take A Guest Seat</h1>
                        <p>No email. No password. Jump straight into a guest table and try 21 Hold&apos;em instantly.</p>

                        {error ? (
                            <div className='guest-landing__status guest-landing__status--error'>{error}</div>
                        ) : null}

                        <div className='guest-landing__cta-row guest-landing__cta-row--quick'>
                            <Button className='guest-landing__primary-cta' onClick={handleQuickGuestLogin} disabled={isLoading}>
                                {isLoading ? 'Opening Table...' : 'Continue As Guest'}
                            </Button>
                            <Button className='guest-landing__secondary-cta' onClick={() => navigate('/guest')} disabled={isLoading}>
                                Open Full Guest Lobby
                            </Button>
                        </div>

                        <button
                            type='button'
                            className='guest-landing__quick-link'
                            onClick={() => navigate('/login')}
                            disabled={isLoading}
                        >
                            Back To Sign In
                        </button>
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

export default GuestQuickLogin;
