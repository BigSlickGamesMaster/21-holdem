import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
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
    const isVisible = overlayState.visible && rows.length > 0;

    return (
        <div className={`game-action-overlay ${isVisible ? 'is-visible' : ''}`}>
            <div className='game-action-overlay__shell'>
                {overlayState.message ? (
                    <div className='game-action-overlay__message'>
                        {overlayState.message}
                    </div>
                ) : null}
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
        </div>
    );
}

export default GameActionOverlay;
