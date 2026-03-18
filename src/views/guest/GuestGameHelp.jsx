import React, { useEffect } from 'react';
import { GUEST_HELP_HOW_TO_PLAY_SECTIONS, GUEST_HELP_RULES_SECTIONS } from 'shared/content/gameGuideContent';

const PANELS = {
    pause: {
        eyebrow: 'Reading Pause',
        title: 'Pause And Read',
        intro: [
            'Use this panel when you want to stop interacting with the table and read without leaving guest mode.',
            'Open the tabs below for a quick guide to how the hand works, what the rules mean, and what 21 Hold\'em is trying to do.',
        ],
        sections: [
            {
                title: 'What this is for',
                bullets: [
                    'Pause the table on your screen while you review the game.',
                    'Read the game basics without navigating away from guest mode.',
                    'Resume the table as soon as you are ready to keep watching or playing.',
                ],
            },
        ],
    },
    howToPlay: {
        eyebrow: 'How To Play',
        title: 'Table Flow In Plain English',
        intro: [
            "21 Hold'em combines betting rounds, private cards and player-requested communal cards.",
        ],
        sections: GUEST_HELP_HOW_TO_PLAY_SECTIONS,
    },
    rules: {
        eyebrow: 'Rules',
        title: 'Core Rules At The Table',
        intro: [
            'These are the rules you need most while watching a guest hand.',
        ],
        sections: GUEST_HELP_RULES_SECTIONS,
    },
    about: {
        eyebrow: 'About',
        title: 'Why 21 Hold\'em Feels Different',
        intro: [
            'This game is built around shared board pressure, readable betting rounds, and timing decisions about when to protect or attack your total.',
        ],
        sections: [
            {
                title: 'Shared board pressure',
                bullets: [
                    'Every community card can shift the hand for everyone still active.',
                    'You are reacting to table momentum, not just your own card value.',
                ],
            },
            {
                title: 'Blackjack instincts, poker tension',
                bullets: [
                    'You still care about building toward 21.',
                    'But you also manage blinds, betting pressure, fold equity, and commitment timing.',
                ],
            },
            {
                title: 'Built to be readable',
                bullets: [
                    'New players can understand the core loop quickly.',
                    'Experienced players still get meaningful pressure points around Stand, Raise, and Double Down.',
                ],
            },
        ],
    },
};

const TAB_ORDER = [
    { id: 'pause', label: 'Pause' },
    { id: 'howToPlay', label: 'How To Play' },
    { id: 'rules', label: 'Rules' },
    { id: 'about', label: 'About' },
];

function GuestGameHelp({ isOpen, activePanel, onOpenPanel, onTogglePause, onClose, isBusy = false }) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = event => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const panel = PANELS[activePanel] || PANELS.pause;

    return (
        <div className={`guest-game-overlay-layer ${isOpen ? 'is-open' : ''}`}>
            <div className="guest-game-menu-toolbar">
                <button
                    type="button"
                    className={`guest-menu-button pause-toggle ${isOpen ? 'is-active' : ''}`}
                    onClick={onTogglePause}
                    disabled={isBusy}
                >
                    {isBusy ? '...' : isOpen ? 'Resume' : 'Pause'}
                </button>
                {TAB_ORDER.filter(tab => tab.id !== 'pause').map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`guest-menu-button ${isOpen && activePanel === tab.id ? 'is-active' : ''}`}
                        onClick={() => onOpenPanel(tab.id)}
                        disabled={isBusy}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {isOpen ? (
                <>
                    <button type="button" className="guest-game-help-backdrop" onClick={onClose} aria-label="Close help overlay" disabled={isBusy} />
                    <div className="guest-game-help-panel" role="dialog" aria-modal="true" aria-label={panel.title}>
                        <div className="guest-game-help-header">
                            <div>
                                <div className="guest-game-help-eyebrow">{panel.eyebrow}</div>
                                <h2>{panel.title}</h2>
                            </div>
                            <button type="button" className="guest-game-resume-button" onClick={onClose} disabled={isBusy}>
                                Resume Game
                            </button>
                        </div>

                        <div className="guest-game-help-tabs">
                            {TAB_ORDER.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={activePanel === tab.id ? 'is-active' : ''}
                                    onClick={() => onOpenPanel(tab.id)}
                                    disabled={isBusy}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="guest-game-help-content">
                            {panel.intro?.map(paragraph => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}

                            {panel.sections?.map(section => (
                                <section key={section.title} className="guest-game-help-section">
                                    <h3>{section.title}</h3>
                                    {section.body?.map(paragraph => (
                                        <p key={paragraph}>{paragraph}</p>
                                    ))}
                                    {section.bullets?.length ? (
                                        <ul>
                                            {section.bullets.map(item => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </section>
                            ))}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

export default GuestGameHelp;
