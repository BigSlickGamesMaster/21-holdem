import React, { useEffect, useMemo, useState } from "react";
import {
    clearSavedGameUiLayout,
    DEFAULT_GAME_UI_LAYOUT,
    dispatchGameUiLayoutUpdate,
    readSavedGameUiLayout,
    saveGameUiLayout,
} from "../../scripts/gameUiLayout";

const CONTROL_GROUPS = [
    {
        title: 'Table',
        controls: [
            { key: 'tableOffsetY', label: 'Table Y', min: -500, max: 240, step: 1 },
            { key: 'tableScale', label: 'Table Scale', min: 0.7, max: 1.35, step: 0.01 },
        ],
    },
    {
        title: 'Top HUD',
        controls: [
            { key: 'headerOffsetY', label: 'Header Y', min: -220, max: 220, step: 1 },
            { key: 'potOffsetY', label: 'Pot Y', min: -220, max: 220, step: 1 },
        ],
    },
    {
        title: 'Seats',
        controls: [
            { key: 'playerProfilesOffsetY', label: 'Profiles Y', min: -260, max: 260, step: 1 },
            { key: 'playerProfilesScale', label: 'Profiles Scale', min: 0.75, max: 1.4, step: 0.01 },
        ],
    },
    {
        title: 'Console',
        controls: [
            { key: 'footerOffsetY', label: 'Console Y', min: -240, max: 260, step: 1 },
        ],
    },
];

const formatLayoutValue = (key, value) => {
    if (key.toLowerCase().includes('scale')) {
        return Number(value || 0).toFixed(2);
    }

    return String(Math.round(Number(value) || 0));
};

function GameLayoutOverlay() {
    const [isOpen, setIsOpen] = useState(true);
    const [copyStatus, setCopyStatus] = useState('');
    const [layout, setLayout] = useState(() => readSavedGameUiLayout());
    const layoutJson = useMemo(() => JSON.stringify(layout, null, 2), [layout]);

    useEffect(() => {
        if (!copyStatus) return undefined;

        const timeout = window.setTimeout(() => {
            setCopyStatus('');
        }, 1800);

        return () => window.clearTimeout(timeout);
    }, [copyStatus]);

    const commitLayout = (nextLayoutOrUpdater) => {
        setLayout(previousLayout => {
            const nextLayout = typeof nextLayoutOrUpdater === 'function'
                ? nextLayoutOrUpdater(previousLayout)
                : nextLayoutOrUpdater;
            const sanitizedLayout = saveGameUiLayout(nextLayout);
            dispatchGameUiLayoutUpdate(sanitizedLayout);
            return sanitizedLayout;
        });
    };

    const updateLayoutValue = (key, rawValue) => {
        commitLayout(previousLayout => ({
            ...previousLayout,
            [key]: Number(rawValue),
        }));
    };

    const handleReset = () => {
        const nextLayout = clearSavedGameUiLayout();
        setLayout(nextLayout);
        dispatchGameUiLayoutUpdate(nextLayout);
        setCopyStatus('Reset');
    };

    const handleCopy = async () => {
        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard unavailable');
            }

            await navigator.clipboard.writeText(layoutJson);
            setCopyStatus('Copied');
        } catch (_error) {
            setCopyStatus('Copy failed');
        }
    };

    return (
        <div className={`game-ui-layout ${isOpen ? 'is-open' : ''}`}>
            <button
                type='button'
                className='game-ui-layout__toggle'
                onClick={() => setIsOpen(previousIsOpen => !previousIsOpen)}
            >
                {isOpen ? 'Hide UI Adjuster' : 'Open UI Adjuster'}
            </button>

            {isOpen && (
                <div className='game-ui-layout__panel'>
                    <div className='game-ui-layout__header'>
                        <div>
                            <p className='game-ui-layout__eyebrow'>Main Game Screen</p>
                            <h2>UI Adjuster</h2>
                        </div>
                        <span className='game-ui-layout__saved'>Auto-saves</span>
                    </div>

                    <p className='game-ui-layout__help'>
                        Move the sliders, watch the table update live, then use <strong>Copy Values</strong> if you want to save the numbers somewhere.
                    </p>

                    {CONTROL_GROUPS.map(group => (
                        <section className='game-ui-layout__group' key={group.title}>
                            <h3>{group.title}</h3>

                            {group.controls.map(control => (
                                <label className='game-ui-layout__control' key={control.key}>
                                    <div className='game-ui-layout__control-head'>
                                        <span>{control.label}</span>
                                        <input
                                            type='number'
                                            value={formatLayoutValue(control.key, layout[control.key])}
                                            min={control.min}
                                            max={control.max}
                                            step={control.step}
                                            onChange={event => updateLayoutValue(control.key, event.target.value)}
                                        />
                                    </div>

                                    <input
                                        className='game-ui-layout__slider'
                                        type='range'
                                        value={layout[control.key] ?? DEFAULT_GAME_UI_LAYOUT[control.key]}
                                        min={control.min}
                                        max={control.max}
                                        step={control.step}
                                        onChange={event => updateLayoutValue(control.key, event.target.value)}
                                    />
                                </label>
                            ))}
                        </section>
                    ))}

                    <div className='game-ui-layout__actions'>
                        <button type='button' onClick={handleCopy}>
                            Copy Values
                        </button>
                        <button type='button' className='is-secondary' onClick={handleReset}>
                            Reset
                        </button>
                    </div>

                    <p className='game-ui-layout__status'>
                        {copyStatus || 'Saved on this device'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default GameLayoutOverlay;
