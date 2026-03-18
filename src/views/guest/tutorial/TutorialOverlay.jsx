import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './tutorial.css';

const HAND_COPY = {
    hand1: {
        eyebrow: 'Hand 1',
        preActionTitle: 'Call To Stay In',
        preActionBody: 'A bet is already open.\n\nCalling means you match the current bet and stay in the hand without adding extra pressure.\n\nThis is the safest way to continue when you want to see how the board develops.\n\nPress Call now.',
        postActionTitle: 'Good. You Matched The Bet',
        postActionBody: 'You stayed involved without committing extra chips.\n\nNow watch the board, because community cards affect every active player.',
        actionLabel: 'Call',
    },
    hand2: {
        eyebrow: 'Hand 2',
        preActionTitle: 'Stand To Protect Your Total',
        preActionBody: 'Your total is decent, but you do not want future board cards changing it.\n\nStanding locks your total for the rest of the hand.\n\nThat means later community cards will no longer improve you, but they also cannot hurt you.\n\nPress Call/Stand now.',
        postActionTitle: 'Good. Your Total Is Locked',
        postActionBody: 'This is a defensive move used to protect a number you already like.\n\nStand is about control, not aggression.',
        actionLabel: 'Call/Stand',
    },
    hand3: {
        eyebrow: 'Hand 3',
        preActionTitle: 'Double Down To Attack',
        preActionBody: 'This hand gives you a strong enough start to attack.\n\nDouble Down means you commit more chips and take exactly one final card immediately.\n\nIt is a stronger, riskier move used when one more card could put you in a powerful position.\n\nPress Double Down now.',
        postActionTitle: 'Good. You Committed To One Final Card',
        postActionBody: 'You increased your commitment and took one final card immediately.\n\nDouble Down is best used when your starting total makes one more card worth the risk.',
        actionLabel: 'Double Down',
    },
};

function getTutorialKey(tutorial) {
    if (tutorial?.sCurrentHandKey) return tutorial.sCurrentHandKey;
    const nHandIndex = Number(tutorial?.nHandIndex);
    const aKeys = ['hand1', 'hand2', 'hand3'];
    return aKeys[nHandIndex] || null;
}

function getCopy(tutorial) {
    return HAND_COPY[getTutorialKey(tutorial)] || {
        eyebrow: 'Tutorial',
        preActionTitle: tutorial?.sTitle || 'Guided Lesson',
        preActionBody: tutorial?.sDescription || 'Loading the next tutorial step.',
        postActionTitle: tutorial?.sTitle || 'Guided Lesson',
        postActionBody: tutorial?.sDescription || 'Loading the next tutorial step.',
        actionLabel: 'Continue',
    };
}

function formatRect(targetRect) {
    if (!targetRect) return null;
    return {
        left: `${targetRect.x - targetRect.width / 2}px`,
        top: `${targetRect.y - targetRect.height / 2}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
    };
}

function getPanelPlacement(targetRect) {
    if (!targetRect || typeof window === 'undefined') return { style: null, side: 'floating' };

    const gap = 18;
    const panelWidth = Math.min(360, window.innerWidth - 32);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetLeft = targetRect.x - targetRect.width / 2;
    const targetRight = targetRect.x + targetRect.width / 2;
    const targetTop = targetRect.y - targetRect.height / 2;
    const targetCenterY = targetRect.y;
    const preferredTop = Math.max(16, Math.min(targetCenterY - 110, viewportHeight - 220));

    if (targetRight + gap + panelWidth <= viewportWidth - 16) {
        return {
            side: 'right',
            style: {
                width: `${panelWidth}px`,
                left: `${targetRight + gap}px`,
                top: `${preferredTop}px`,
            },
        };
    }

    if (targetLeft - gap - panelWidth >= 16) {
        return {
            side: 'left',
            style: {
                width: `${panelWidth}px`,
                left: `${targetLeft - gap - panelWidth}px`,
                top: `${preferredTop}px`,
            },
        };
    }

    return {
        side: 'bottom',
        style: {
            width: `${panelWidth}px`,
            left: `${Math.max(16, Math.min(targetRect.x - panelWidth / 2, viewportWidth - panelWidth - 16))}px`,
            top: `${Math.min(targetTop - 170, viewportHeight - 210) < 16 ? targetRect.y + targetRect.height / 2 + gap : Math.min(targetTop - 170, viewportHeight - 210)}px`,
        },
    };
}

function TutorialOverlay() {
    const navigate = useNavigate();
    const [overlayState, setOverlayState] = useState({
        tutorial: null,
        title: "Learn 21 Hold'em In 3 Hands",
        body: 'This table is set up as a guided lesson.\n\nYou are playing against 2 bots so each decision is easy to follow.\n\nWe will play 3 short hands.\n\nIn each hand, I will explain one move and why it matters.',
        eyebrow: 'Guided Table',
        targetRect: null,
        isComplete: false,
        phase: 'intro',
    });

    useEffect(() => {
        const handleUpdate = event => {
            const detail = event.detail || {};
            setOverlayState(current => {
                const tutorial = detail.tutorial || current.tutorial;
                const copy = getCopy(tutorial);

                switch (detail.type) {
                    case 'sceneReady':
                        return {
                            ...current,
                            eyebrow: 'Guided Table',
                            title: "Learn 21 Hold'em In 3 Hands",
                            body: 'This table is set up as a guided lesson.\n\nYou are playing against 2 bots so each decision is easy to follow.\n\nWe will play 3 short hands.\n\nIn each hand, I will explain one move and why it matters.',
                            phase: 'intro',
                        };
                    case 'tutorialState':
                        return {
                            ...current,
                            tutorial,
                            eyebrow: copy.eyebrow,
                            title: copy.preActionTitle,
                            body: copy.preActionBody,
                            targetRect: null,
                            isComplete: Boolean(tutorial?.bCompleted),
                            phase: 'preAction',
                        };
                    case 'waiting':
                        return {
                            ...current,
                            tutorial,
                            eyebrow: copy.eyebrow,
                            title: 'Watch The Table Reset',
                            body: 'The next guided hand is being prepared.\n\nStay with the table and watch how the result transitions into the next lesson.',
                            targetRect: null,
                            phase: 'betweenHands',
                        };
                    case 'playerTurn':
                        return {
                            ...current,
                            tutorial,
                            eyebrow: copy.eyebrow,
                            title: copy.preActionTitle,
                            body: copy.preActionBody,
                            targetRect: detail.targetRect || null,
                            isComplete: false,
                            phase: 'preAction',
                        };
                    case 'userAction':
                        return {
                            ...current,
                            tutorial,
                            eyebrow: copy.eyebrow,
                            title: copy.postActionTitle,
                            body: copy.postActionBody,
                            targetRect: null,
                            phase: 'postAction',
                        };
                    case 'handResult':
                        if (tutorial?.bCompleted) {
                            return {
                                ...current,
                                tutorial,
                                eyebrow: 'Tutorial Complete',
                                title: 'Tutorial Complete',
                                body: 'You have now seen 3 core ideas in 21 Hold\'em.\n\nCall keeps you in the hand.\n\nStand protects a total you want to keep.\n\nDouble Down attacks when your starting position is strong enough.',
                                targetRect: null,
                                isComplete: true,
                                phase: 'complete',
                            };
                        }
                        return {
                            ...current,
                            tutorial,
                            eyebrow: copy.eyebrow,
                            title: 'Hand Complete',
                            body: 'That lesson is complete.\n\nThe next guided hand will load automatically.',
                            targetRect: null,
                            isComplete: false,
                            phase: 'betweenHands',
                        };
                    default:
                        return current;
                }
            });
        };

        window.addEventListener('guest-tutorial:update', handleUpdate);
        return () => window.removeEventListener('guest-tutorial:update', handleUpdate);
    }, []);

    const targetStyle = useMemo(() => formatRect(overlayState.targetRect), [overlayState.targetRect]);
    const panelPlacement = useMemo(() => getPanelPlacement(overlayState.targetRect), [overlayState.targetRect]);
    const panelVariantClass = targetStyle
        ? `anchored anchored-${panelPlacement.side}`
        : overlayState.phase === 'intro'
            ? 'floating intro-card'
            : 'floating';

    return (
        <div className={`guest-tutorial-overlay ${overlayState.phase || 'intro'} ${targetStyle ? 'has-target' : 'no-target'}`}>
            <div className='guest-tutorial-dim' />
            {targetStyle ? <div className='guest-tutorial-target' style={targetStyle} /> : null}
            <div
                className={`guest-tutorial-panel ${panelVariantClass}`}
                style={targetStyle ? panelPlacement.style || undefined : undefined}
            >
                <div className='guest-tutorial-eyebrow'>{overlayState.eyebrow}</div>
                <h2>{overlayState.title}</h2>
                {String(overlayState.body || '').split('\n\n').map((paragraph, index) => (
                    <p key={`${overlayState.eyebrow}-${index}`}>{paragraph}</p>
                ))}
                <div className='guest-tutorial-actions'>
                    {overlayState.isComplete ? (
                        <>
                            <button type='button' onClick={() => navigate('/guest/tutorial', { replace: true })}>
                                Replay Tutorial
                            </button>
                            <button type='button' className='secondary' onClick={() => navigate('/guest', { replace: true })}>
                                Back To Guest Table
                            </button>
                        </>
                    ) : (
                        <button type='button' className='secondary' onClick={() => navigate('/guest', { replace: true })}>
                            Exit Tutorial
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TutorialOverlay;
