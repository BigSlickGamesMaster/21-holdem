import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { guestLogin, joinGuestTutorialTable } from 'query/guest.query';

function getGuestDeviceId() {
    const storageKey = 'guest-device-id';
    const existingId = window.localStorage.getItem(storageKey);
    if (existingId) return existingId;

    const nextId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, nextId);
    return nextId;
}

function GuestTutorialLanding() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const guestDeviceId = useMemo(() => getGuestDeviceId(), []);
    const hasStartedRef = useRef(false);

    const handleEnterTutorial = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        try {
            const loginResponse = await guestLogin({ sDeviceId: guestDeviceId });
            const sAuthToken = loginResponse?.headers?.authorization || loginResponse?.data?.data?.sToken;
            if (!sAuthToken) throw new Error('Guest token was not returned');

            const joinResponse = await joinGuestTutorialTable({ sAuthToken });
            const iBoardId = joinResponse?.data?.data?.iBoardId;
            if (!iBoardId) throw new Error('Tutorial table was not created');

            navigate('/guest/tutorial/game', {
                state: {
                    sAuthToken,
                    iBoardId,
                    fallbackPath: '/guest/tutorial',
                    isGuest: true,
                    isGuestTutorial: true,
                },
            });
        } catch (requestError) {
            const message = requestError?.response?.data?.message || requestError?.message || 'Unable to open guided tutorial';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        handleEnterTutorial();
    }, []);

    return (
        <div className='d-flex flex-column align-items-center justify-content-center py-5 text-center'>
            <h2 className='mb-3 text-white'>Opening Guided Tutorial</h2>
            <p className='mb-4 text-white'>
                Loading a private 3-hand lesson with 2 bots and a curated Double Down finish.
            </p>
            {isLoading ? <Spinner animation='border' /> : null}
            {error ? (
                <>
                    <div className='mt-4 text-white'>{error}</div>
                    <Button className='mt-4' onClick={handleEnterTutorial} disabled={isLoading}>
                        TRY AGAIN
                    </Button>
                </>
            ) : null}
            {!isLoading && !error ? (
                <Button className='mt-4' onClick={handleEnterTutorial}>
                    START TUTORIAL
                </Button>
            ) : null}
        </div>
    );
}

export default GuestTutorialLanding;
