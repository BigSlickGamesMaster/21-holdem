import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { getProfile } from '../../query/profile.query';
import _ from '../../scripts/helper';
import {
    createHiddenGameActionOverlayState,
    emitGameActionOverlayCommand,
    GAME_ACTION_OVERLAY_STATE_EVENT,
} from '../../scripts/gameActionOverlayBridge';

const BUTTON_CLASS_BY_VARIANT = {
    primary: 'guest-entry-btn',
    secondary: 'about-entry-btn',
};

function GameActionOverlay({ isPaused = false }) {
    const [overlayState, setOverlayState] = useState(() => createHiddenGameActionOverlayState());
    const { data: profileData } = useQuery('profileData', getProfile, {
        select: (data) => data?.data?.data,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        const handleStateUpdate = (event) => {
            setOverlayState({
                ...createHiddenGameActionOverlayState(),
                ...(event?.detail || {}),
            });
        };

        window.addEventListener(GAME_ACTION_OVERLAY_STATE_EVENT, handleStateUpdate);
        return () => window.removeEventListener(GAME_ACTION_OVERLAY_STATE_EVENT, handleStateUpdate);
    }, []);

    const rows = useMemo(() => Array.isArray(overlayState.rows) ? overlayState.rows : [], [overlayState.rows]);
    const hasButtons = useMemo(() => rows.some((row) => {
        const rowButtons = Array.isArray(row?.buttons) ? row.buttons.filter(Boolean) : [];
        return rowButtons.length > 0;
    }), [rows]);
    const hasMessage = Boolean(overlayState.message);
    const commentary = useMemo(() => Array.isArray(overlayState.commentary) ? overlayState.commentary.filter(Boolean) : [], [overlayState.commentary]);
    const bankrollAmount = typeof profileData?.nChips === 'number' ? _.formatCurrency(profileData.nChips) : '--';
    const tableBankrollAmount = Number.isFinite(Number(overlayState.tableBankroll))
        ? _.formatCurrency(Number(overlayState.tableBankroll))
        : '--';
    const isVisible = Boolean(overlayState.visible);

    return (
        <div className={`game-action-overlay ${isVisible ? 'is-visible' : ''}`.trim()}>
            <div className='game-action-overlay__shell'>
                {hasMessage ? (
                    <div className='game-action-overlay__message'>
                        {overlayState.message}
                    </div>
                ) : null}
                <div className='game-action-overlay__tray'>
                    <div className='game-action-overlay__bankroll'>
                        <div className='game-action-overlay__bankroll-slot game-action-overlay__bankroll-slot--left'>
                            <span className='game-action-overlay__bankroll-label'>Bankroll</span>
                            <span className='game-action-overlay__bankroll-value'>{bankrollAmount}</span>
                        </div>
                        <div className='game-action-overlay__bankroll-slot game-action-overlay__bankroll-slot--center'>
                            <span className='game-action-overlay__bankroll-label'>Table Bankroll</span>
                            <span className='game-action-overlay__bankroll-value'>{tableBankrollAmount}</span>
                        </div>
                        <div className='game-action-overlay__bankroll-slot game-action-overlay__bankroll-slot--right'>
                            <button
                                type='button'
                                className='game-action-overlay__exit-btn'
                                onClick={() => emitGameActionOverlayCommand('exitTable')}
                                aria-label='Exit table'
                            >
                                ✕ Exit
                            </button>
                        </div>
                    </div>
                    {hasButtons ? (
                        <div className='game-action-overlay__rows game-action-overlay__rows--interactive'>
                            {rows.map((row, rowIndex) => {
                                const rowButtons = Array.isArray(row?.buttons) ? row.buttons.filter(Boolean) : [];
                                if (!rowButtons.length) return null;

                                return (
                                    <div
                                        key={row.id || `row-${rowIndex}`}
                                        className={`game-action-overlay__row auth-intro-actions ${row.className || ''}`.trim()}
                                    >
                                        {rowButtons.map((button) => {
                                            const variantClass = BUTTON_CLASS_BY_VARIANT[button.variant] || BUTTON_CLASS_BY_VARIANT.secondary;
                                            const widthClass = button.widthClass || '';

                                            return (
                                                <Button
                                                    key={button.key}
                                                    type='button'
                                                    className={`${variantClass} ${widthClass}`.trim()}
                                                    data-game-action-key={button.key}
                                                    disabled={isPaused || button.disabled}
                                                    onClick={() => emitGameActionOverlayCommand(button.key, {
                                                        amount: button.amount,
                                                    })}
                                                >
                                                    {button.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className='game-action-overlay__commentary'>
                            {commentary.length ? commentary.map((entry, index) => (
                                <div key={`commentary-${index}`} className='game-action-overlay__commentary-entry'>
                                    {entry}
                                </div>
                            )) : (
                                <div className='game-action-overlay__commentary-entry game-action-overlay__commentary-entry--empty'>
                                    Waiting for table activity
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GameActionOverlay;
