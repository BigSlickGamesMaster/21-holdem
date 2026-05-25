import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_BROWSER_EVENTS } from '../../scripts/gameEvents';

const EMOJIS = ['😂', '😍', '😎', '🤑', '😤', '😱', '💪', '🔥', '💯', '👑', '🤞', '🎉'];

export const EMOJI_SENT_EVENT = GAME_BROWSER_EVENTS.EMOJI_SENT;

export default function EmojiPicker() {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const handleSelect = useCallback((sEmoji) => {
        setOpen(false);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(EMOJI_SENT_EVENT, { detail: { sEmoji } }));
        }
    }, []);

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const onOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onOutside);
        return () => document.removeEventListener('pointerdown', onOutside);
    }, [open]);

    return (
        <div ref={containerRef} className='emoji-picker' aria-label='Emoji reactions'>
            {open && (
                <div className='emoji-picker__grid' role='listbox'>
                    {EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type='button'
                            className='emoji-picker__item'
                            role='option'
                            aria-label={emoji}
                            onClick={() => handleSelect(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
            <button
                type='button'
                className={`emoji-picker__trigger${open ? ' emoji-picker__trigger--open' : ''}`}
                aria-label='Open emoji picker'
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className='emoji-picker__trigger-icon'>😊</span>
                <span className='emoji-picker__trigger-arrow'>▲</span>
            </button>
        </div>
    );
}
