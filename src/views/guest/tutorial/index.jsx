import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'react-bootstrap';
import { joinGuestTutorialTable } from 'query/guest.query';
import roundOneTutorial from '../../../assets/images/bg/round_1_tutorial.png';
import sceneOne from '../../../assets/images/bg/scene_1.png';
import communityCards from '../../../assets/images/bg/community.png';
import guestWelcomeCharacter from '../../../assets/images/bg/master_welcome.png';
import callButtonTutorial from '../../../assets/images/buttons/call_button_tutorial.png';
import raiseButtonTutorial from '../../../assets/images/buttons/raise_button_tutorial.png';
import callStandButtonTutorial from '../../../assets/images/buttons/call_stand_button_ tutorial.png';
import foldButtonTutorial from '../../../assets/images/buttons/fold_button_tutorial.png';
import { getGuestDeviceId, loginGuestWithDeviceId } from '../session';

const TUTORIAL_STEPS = [
    {
        id: 'intro',
        type: 'text',
        title: 'New here?',
        body: 'Let me show you the basics of 21 Hold\'em before we deal the guided hands.',
    },
    {
        id: 'game-overview',
        type: 'text',
        title: 'What Is 21 Hold\'em?',
        body: '21 Hold\'em gives you the playing style of poker with the simplicity of blackjack scoring. Build the best hand you can, but do not go over 21 or you will bust.',
    },
    {
        id: 'table-overview',
        type: 'image',
        image: sceneOne,
        imageAlt: '21 Holdem table scene',
        caption: 'This is the table the walkthrough keeps referencing while I explain the flow.',
    },
    {
        id: 'blinds',
        type: 'text',
        title: 'Blinds Start The Action',
        body: 'Just like poker, we have big and small blinds. The game blends the betting pressure of poker with blackjack-style totals.',
    },
    {
        id: 'community-cards',
        type: 'image',
        image: communityCards,
        imageAlt: '21 Holdem community cards tutorial',
        title: 'Community Cards Arrive One Per Round',
        body: 'Think of it like a flop revealed over time. Players receive one community card each round, and if you stand on a total you like, no more community cards are added to your score.',
    },
    {
        id: 'button-row',
        type: 'image',
        image: roundOneTutorial,
        imageAlt: '21 Holdem opening round tutorial image',
        caption: 'Let\'s zoom in on the action row. This is where you will make your table decisions during the hand.',
    },
    {
        id: 'button-gallery',
        type: 'button-gallery',
        items: [
            {
                image: callButtonTutorial,
                imageAlt: 'Call tutorial button',
                body: 'Call keeps you in the hand by matching the current bet while leaving the door open for more community cards.',
            },
            {
                image: callStandButtonTutorial,
                imageAlt: 'Call Stand tutorial button',
                body: 'Call / Stand matches the bet but tells the dealer you do not want more community cards, locking in your current total.',
            },
            {
                image: raiseButtonTutorial,
                imageAlt: 'Raise tutorial button',
                body: 'Raise pushes the stakes higher when the board and your total put you in a strong position.',
            },
            {
                image: foldButtonTutorial,
                imageAlt: 'Fold tutorial button',
                body: 'Fold gets you out of the hand. You lose the chips you have already committed, but you stop the damage there.',
            },
        ],
    },
    {
        id: 'showdown',
        type: 'image',
        image: guestWelcomeCharacter,
        imageAlt: '21 Holdem tutorial host character',
        title: 'Ready For The Showdown?',
        body: 'Once all players are happy with their totals, without going over 21, we see who has won.',
    },
    {
        id: 'buttons-summary',
        type: 'image',
        image: roundOneTutorial,
        imageAlt: '21 Holdem tutorial controls summary',
        caption: 'That is the core action row: Call, Raise, Call / Stand, and Fold. Once those feel familiar, you are ready for the guided table.',
    },
];

function GuestTutorialLanding() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMessageTyping, setIsMessageTyping] = useState(true);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const guestDeviceId = useMemo(() => getGuestDeviceId(), []);
    const chatPanelRef = useRef(null);
    const conversationEntries = [];
    const totalSteps = TUTORIAL_STEPS.length;
    const revealedSteps = isMessageTyping ? activeStepIndex : activeStepIndex + 1;
    const progressPercent = Math.max(0, Math.min(100, Math.round((revealedSteps / totalSteps) * 100)));
    const remainingSteps = Math.max(totalSteps - revealedSteps, 0);

    const scrollChatToBottom = (behavior = 'smooth') => {
        if (!chatPanelRef.current) return;

        window.requestAnimationFrame(() => {
            if (!chatPanelRef.current) return;

            chatPanelRef.current.scrollTo({
                top: chatPanelRef.current.scrollHeight,
                behavior,
            });
        });
    };

    const scrollStepIntoView = (stepId, behavior = 'smooth') => {
        if (!chatPanelRef.current || !stepId) return;

        window.requestAnimationFrame(() => {
            if (!chatPanelRef.current) return;

            const target = chatPanelRef.current.querySelector(`[data-step-id="${stepId}"]`);
            if (!target) return;

            chatPanelRef.current.scrollTo({
                top: target.offsetTop - 4,
                behavior,
            });
        });
    };

    if (TUTORIAL_STEPS.length > 0 && (activeStepIndex > 0 || !isMessageTyping)) {
        conversationEntries.push({
            key: `host-${TUTORIAL_STEPS[0].id}`,
            sender: 'host',
            step: TUTORIAL_STEPS[0],
            incoming: activeStepIndex === 0 && !isMessageTyping,
        });
    }

    for (let stepIndex = 1; stepIndex <= activeStepIndex; stepIndex += 1) {
        conversationEntries.push({
            key: `player-read-more-${stepIndex}`,
            sender: 'player',
            step: {
                type: 'player-text',
                title: 'Read more',
            },
            incoming: false,
        });

        if (stepIndex < activeStepIndex || !isMessageTyping) {
            conversationEntries.push({
                key: `host-${TUTORIAL_STEPS[stepIndex].id}`,
                sender: 'host',
                step: TUTORIAL_STEPS[stepIndex],
                incoming: stepIndex === activeStepIndex,
            });
        }
    }

    const handleEnterTutorial = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError('');

        try {
            const sAuthToken = await loginGuestWithDeviceId(guestDeviceId);
            const joinResponse = await joinGuestTutorialTable({ sAuthToken });
            const iBoardId = joinResponse?.data?.data?.iBoardId;
            if (!iBoardId) throw new Error('Guest table was not created');

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
            const message = requestError?.response?.data?.message || requestError?.message || 'Unable to open guest table';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsMessageTyping(true);

        const timeoutId = window.setTimeout(() => {
            setIsMessageTyping(false);
        }, 4000);

        return () => window.clearTimeout(timeoutId);
    }, [activeStepIndex]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const activeStep = TUTORIAL_STEPS[activeStepIndex];

            if (activeStep?.id === 'button-gallery' && !isMessageTyping) {
                scrollStepIntoView(activeStep.id, 'smooth');
                return;
            }

            scrollChatToBottom('smooth');
        }, 80);

        return () => window.clearTimeout(timeoutId);
    }, [activeStepIndex, isMessageTyping]);

    const handleReadMore = () => {
        setActiveStepIndex(current => {
            if (current >= TUTORIAL_STEPS.length - 1) return current;
            return current + 1;
        });
    };

    return (
        <div className='guest-landing guest-landing--tutorial guest-landing--themed'>
            <div className='guest-landing__ambient-grid' aria-hidden='true' />
            <div className='guest-landing__lobby-atmosphere' aria-hidden='true'>
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--one' />
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--two' />
                <span className='guest-landing__lobby-orb guest-landing__lobby-orb--three' />
                <span className='guest-landing__lobby-beam' />
            </div>

            <section className='guest-landing__hero'>
                <div className='guest-landing__hero-media'>
                    <div className='guest-landing__table-preview'>
                        <div className='guest-landing__phone-topbar' aria-hidden='true'>
                            <span />
                        </div>

                        <div className='guest-landing__preview-footer guest-landing__preview-chat'>
                            <div className='guest-landing__chat-meta'>
                                <div className='guest-landing__chat-avatar'>
                                    <img src={guestWelcomeCharacter} alt='Tutorial host avatar' />
                                </div>
                                <div>
                                    <strong>Tutorial Host</strong>
                                    <span>Guided walkthrough</span>
                                </div>
                                <div className='guest-landing__chat-progress' aria-live='polite'>
                                    <strong>{progressPercent}% complete</strong>
                                    <span>{remainingSteps} steps left</span>
                                </div>
                                <button
                                    type='button'
                                    className='guest-landing__tutorial-close'
                                    onClick={() => navigate('/guest')}
                                    disabled={isLoading}
                                    aria-label='Close tutorial'
                                >
                                    X
                                </button>
                            </div>

                            <div ref={chatPanelRef} className='guest-landing__chat-thread'>
                                {conversationEntries.map(entry => {
                                    const incomingClass = entry.incoming ? 'guest-landing__message-copy--incoming' : '';

                                    if (entry.step.type === 'button-gallery') {
                                        return (
                                            <div
                                                key={entry.key}
                                                data-step-id={entry.step.id}
                                                className={`guest-landing__message-attachment guest-landing__message-attachment--gallery ${incomingClass}`}
                                            >
                                                {entry.step.items.map(item => (
                                                    <div key={item.imageAlt} className='guest-landing__button-card'>
                                                        <div className='guest-landing__message-media'>
                                                            <img
                                                                className='guest-landing__message-image'
                                                                src={item.image}
                                                                alt={item.imageAlt}
                                                                onLoad={() => scrollStepIntoView(entry.step.id, 'smooth')}
                                                            />
                                                        </div>
                                                        <div className='guest-landing__button-card-copy'>
                                                            <span>{item.body}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    if (entry.step.type === 'image') {
                                        return (
                                            <figure
                                                key={entry.key}
                                                data-step-id={entry.step.id}
                                                className={`guest-landing__message-attachment ${incomingClass}`}
                                            >
                                                <div className='guest-landing__message-media'>
                                                    <img
                                                        className='guest-landing__message-image'
                                                        src={entry.step.image}
                                                        alt={entry.step.imageAlt}
                                                        onLoad={() => scrollChatToBottom('smooth')}
                                                    />
                                                </div>
                                                {entry.step.caption || entry.step.title || entry.step.body ? (
                                                    <figcaption>
                                                        {entry.step.caption ? <span>{entry.step.caption}</span> : null}
                                                        {entry.step.title ? <strong>{entry.step.title}</strong> : null}
                                                        {entry.step.body ? <span>{entry.step.body}</span> : null}
                                                    </figcaption>
                                                ) : null}
                                            </figure>
                                        );
                                    }

                                    if (entry.sender === 'player') {
                                        return (
                                            <div key={entry.key} className='guest-landing__message-copy guest-landing__message-copy--player'>
                                                <span>{entry.step.title}</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={entry.key}
                                            data-step-id={entry.step.id}
                                            className={`guest-landing__message-copy ${incomingClass}`}
                                        >
                                            <strong>{entry.step.title}</strong>
                                            <span>{entry.step.body}</span>
                                        </div>
                                    );
                                })}

                                {isMessageTyping ? (
                                    <div className='guest-landing__typing-row' aria-hidden='true'>
                                        <span className='guest-landing__typing-label'>typing</span>
                                        <span className='guest-landing__typing-bubble'>
                                            <span className='guest-landing__typing-dot' />
                                            <span className='guest-landing__typing-dot' />
                                            <span className='guest-landing__typing-dot' />
                                        </span>
                                    </div>
                                ) : null}
                            </div>

                            <div className='guest-landing__chat-actions'>
                                {error ? (
                                    <div className='guest-landing__status guest-landing__status--error'>{error}</div>
                                ) : null}

                                {activeStepIndex < TUTORIAL_STEPS.length - 1 ? (
                                    <button
                                        type='button'
                                        className='guest-landing__read-more'
                                        onClick={handleReadMore}
                                        disabled={isLoading}
                                    >
                                        <span>Read more</span>
                                    </button>
                                ) : null}
                            </div>

                            <div className='guest-landing__phone-cta'>
                                <Button className='guest-landing__primary-cta guest-landing__primary-cta--phone' onClick={handleEnterTutorial} disabled={isLoading}>
                                    {isLoading ? 'Opening Seat...' : 'Take A Seat'}
                                </Button>
                            </div>
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

export default GuestTutorialLanding;
