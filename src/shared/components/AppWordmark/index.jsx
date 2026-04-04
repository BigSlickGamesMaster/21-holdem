import React from 'react';

const AppWordmark = ({ className = '' }) => {
    return (
        <svg
            className={className}
            viewBox="0 0 360 92"
            role="img"
            aria-label="21 Hold'em"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="wordmark-steel" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F8FEFF" />
                    <stop offset="34%" stopColor="#E5F2FF" />
                    <stop offset="68%" stopColor="#ADC6DD" />
                    <stop offset="100%" stopColor="#6B829C" />
                </linearGradient>
                <linearGradient id="wordmark-steel-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                    <stop offset="30%" stopColor="rgba(255,255,255,0.18)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id="wordmark-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFF6D2" />
                    <stop offset="26%" stopColor="#FFE27A" />
                    <stop offset="56%" stopColor="#F6B242" />
                    <stop offset="100%" stopColor="#B86B1E" />
                </linearGradient>
                <linearGradient id="wordmark-gold-edge" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFF0B6" />
                    <stop offset="100%" stopColor="#F0A331" />
                </linearGradient>
                <linearGradient id="wordmark-aqua" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#65D8FF" />
                    <stop offset="52%" stopColor="#9DEFFF" />
                    <stop offset="100%" stopColor="#FFD874" />
                </linearGradient>
                <radialGradient id="wordmark-chip-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1B4E79" />
                    <stop offset="100%" stopColor="#0A1B2D" />
                </radialGradient>
                <linearGradient id="wordmark-panel" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(38, 88, 136, 0.25)" />
                    <stop offset="44%" stopColor="rgba(119, 212, 255, 0.12)" />
                    <stop offset="100%" stopColor="rgba(255, 211, 107, 0.18)" />
                </linearGradient>
                <filter id="wordmark-shadow" x="-20%" y="-35%" width="140%" height="180%">
                    <feDropShadow dx="0" dy="4" stdDeviation="2.8" floodColor="#07111D" floodOpacity="0.68" />
                    <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#000000" floodOpacity="0.28" />
                </filter>
                <filter id="wordmark-glow" x="-40%" y="-80%" width="180%" height="260%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="1 0 0 0 0
                                0 1 0 0 0.18
                                0 0 1 0 0.28
                                0 0 0 0.9 0"
                    />
                </filter>
            </defs>

            <g filter="url(#wordmark-shadow)">
                <path
                    d="M10 68C14 38 40 20 82 16L298 16C322 16 340 26 349 44C336 41 323 40 306 40H94C60 40 34 50 10 68Z"
                    fill="url(#wordmark-panel)"
                />
                <path
                    d="M16 73C30 52 56 42 92 42H304C318 42 329 43 339 47"
                    fill="none"
                    stroke="rgba(126, 219, 255, 0.32)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />

                <text
                    x="8"
                    y="66"
                    fontFamily="'TT Commons', 'Arial Black', sans-serif"
                    fontSize="58"
                    fontWeight="800"
                    letterSpacing="-3"
                    fill="url(#wordmark-steel)"
                    stroke="#0D1723"
                    strokeWidth="4"
                    paintOrder="stroke"
                >
                    21
                </text>
                <path
                    d="M19 27H61"
                    fill="none"
                    stroke="url(#wordmark-steel-sheen)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.85"
                />

                <text
                    x="78"
                    y="67"
                    fontFamily="'Neue Plak Condensed', 'Trebuchet MS', sans-serif"
                    fontSize="54"
                    fontWeight="700"
                    fontStyle="italic"
                    letterSpacing="1"
                    fill="url(#wordmark-gold)"
                    stroke="#2A1A0E"
                    strokeWidth="4"
                    paintOrder="stroke"
                >
                    Hold&apos;em
                </text>
                <path
                    d="M82 31H302"
                    fill="none"
                    stroke="url(#wordmark-gold-edge)"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    opacity="0.55"
                />

                <path
                    d="M80 77C128 71 214 71 320 75"
                    fill="none"
                    stroke="url(#wordmark-aqua)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <path
                    d="M80 77C128 71 214 71 320 75"
                    fill="none"
                    stroke="url(#wordmark-aqua)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.28"
                    filter="url(#wordmark-glow)"
                />

                <g transform="translate(309 26)">
                    <circle cx="20" cy="20" r="18" fill="url(#wordmark-chip-core)" stroke="#74DBFF" strokeWidth="2.2" />
                    <circle cx="20" cy="20" r="10.5" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="1.4" />
                    <path
                        d="M20 10C23.6 10 26.7 12.3 27.8 15.5C29.6 15.4 31.4 16.3 32.5 17.8C33.6 19.2 33.8 21.2 33.1 22.8C32.3 24.5 30.7 25.7 28.9 25.9C28.8 30.4 25 34 20.4 34H19.6C15 34 11.2 30.4 11.1 25.9C9.3 25.7 7.7 24.5 6.9 22.8C6.2 21.2 6.4 19.2 7.5 17.8C8.6 16.3 10.4 15.4 12.2 15.5C13.3 12.3 16.4 10 20 10Z"
                        fill="url(#wordmark-gold)"
                        stroke="#2A1A0E"
                        strokeWidth="1.2"
                        transform="translate(0 -0.5)"
                    />
                    <path d="M20 24.4L24.4 29H15.6L20 24.4Z" fill="#2A1A0E" />
                </g>
            </g>
        </svg>
    );
};

export default AppWordmark;
