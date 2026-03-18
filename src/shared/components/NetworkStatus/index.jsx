import React, { useState, useEffect } from 'react';

function InternetStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            document.body.style.overflowY = 'auto';
        };
        const handleOffline = () => {
            setIsOnline(false);
            document.body.style.overflow = 'hidden';
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Set initial overflow state
        if (!isOnline) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            // Reset overflow when component unmounts
            document.body.style.overflowY = 'auto';
        };
    }, [isOnline]);

    return (
        <div>
            {!isOnline && (
                <>
                    <div className='no-internet-background' />
                    <div className='no-internet-popup'>
                        <div className='icon'>
                            <svg
                                style={{
                                    animation: 'wiggle 2s ease-in-out infinite',
                                    transformOrigin: 'center'
                                }}
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="rgb(255, 65, 65)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                                <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                <line x1="12" y1="20" x2="12.01" y2="20"></line>
                            </svg>
                        </div>
                        <div className='content-popup'>
                            <p>No Internet Connection</p>
                            <p style={{ fontSize: '14px', marginTop: '5px' }}>
                                Please check your network connection
                            </p>
                        </div>

                    </div>
                    <style>
                        {`
                            @keyframes wiggle {
                                0%, 100% { transform: rotate(0deg); }
                                25% { transform: rotate(-3deg); }
                                75% { transform: rotate(3deg); }
                            }
                        `}
                    </style>
                </>
            )}
        </div>
    );
}

export default InternetStatus;
