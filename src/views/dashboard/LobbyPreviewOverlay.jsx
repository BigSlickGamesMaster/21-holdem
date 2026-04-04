import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'scripts/helper';

const PLAYER_OPTIONS = [4, 6, 9];
const BUY_IN_OPTIONS = [1000, 5000, 15000, 20000];

function formatAmount(amount) {
    const nAmount = Number(amount) || 0;
    return _.formatCurrencyWithComa(nAmount);
}

function getBlindLabel(nMinBet) {
    const nSmallBlind = Number(nMinBet) || 0;
    const nBigBlind = nSmallBlind * 2;
    return `${formatAmount(nSmallBlind)}/${formatAmount(nBigBlind)}`;
}

function getDefaultSeatCount(tables) {
    return PLAYER_OPTIONS.find(nSeatCount =>
        (tables || []).some(table => Number(table.nMaxPlayer) === nSeatCount)
    ) || PLAYER_OPTIONS[0];
}

function getDefaultBuyIn(tables, nSeatCount) {
    return BUY_IN_OPTIONS.find(nBuyIn =>
        (tables || []).some(
            table => Number(table.nMaxPlayer) === nSeatCount && Number(table.nMinBuyIn) === nBuyIn
        )
    ) || BUY_IN_OPTIONS[0];
}

function getSelectedOptionIndex(options, value) {
    const nIndex = options.indexOf(value);
    return nIndex >= 0 ? nIndex : 0;
}

function LobbyPreviewOverlay({ isOpen, isEmbedded, onClose, tables, onJoinTable, isJoining, isLoading }) {
    const [nActiveSeatCount, setNActiveSeatCount] = useState(PLAYER_OPTIONS[0]);
    const [nActiveBuyIn, setNActiveBuyIn] = useState(BUY_IN_OPTIONS[0]);
    const [bHasAdjustedFilters, setBHasAdjustedFilters] = useState(false);

    useEffect(() => {
        if (!isOpen || bHasAdjustedFilters || !(tables || []).length) return;

        const nDefaultSeatCount = getDefaultSeatCount(tables);
        const nDefaultBuyIn = getDefaultBuyIn(tables, nDefaultSeatCount);

        setNActiveSeatCount(nDefaultSeatCount);
        setNActiveBuyIn(nDefaultBuyIn);
    }, [isOpen, bHasAdjustedFilters, tables]);

    const aFilteredTables = useMemo(() => (
        (tables || [])
            .filter(table => (
                Number(table.nMaxPlayer) === nActiveSeatCount
                && Number(table.nMinBuyIn) === nActiveBuyIn
            ))
            .sort((a, b) => {
                const nPlayerDiff = Number(b.nActivePlayers || 0) - Number(a.nActivePlayers || 0);
                if (nPlayerDiff !== 0) return nPlayerDiff;

                const nBlindDiff = Number(a.nMinBet || 0) - Number(b.nMinBet || 0);
                if (nBlindDiff !== 0) return nBlindDiff;

                return String(a.sName || '').localeCompare(String(b.sName || ''));
            })
    ), [tables, nActiveSeatCount, nActiveBuyIn]);

    const oPrimaryTable = aFilteredTables[0] || null;
    const nSeatSliderIndex = getSelectedOptionIndex(PLAYER_OPTIONS, nActiveSeatCount);
    const nBuyInSliderIndex = getSelectedOptionIndex(BUY_IN_OPTIONS, nActiveBuyIn);
    const bShowCloseButton = !isEmbedded && typeof onClose === 'function';

    const handleSeatCountChange = (nIndex) => {
        const nNextSeatCount = PLAYER_OPTIONS[Number(nIndex)] || PLAYER_OPTIONS[0];
        setBHasAdjustedFilters(true);
        setNActiveSeatCount(nNextSeatCount);
    };

    const handleBuyInChange = (nIndex) => {
        const nNextBuyIn = BUY_IN_OPTIONS[Number(nIndex)] || BUY_IN_OPTIONS[0];
        setBHasAdjustedFilters(true);
        setNActiveBuyIn(nNextBuyIn);
    };

    if (!isOpen) return null;

    return (
        <div
            className={`lobby-preview-overlay ${isEmbedded ? 'lobby-preview-overlay--embedded' : ''}`}
            role={isEmbedded ? undefined : 'dialog'}
            aria-modal={isEmbedded ? undefined : 'true'}
            aria-label={isEmbedded ? undefined : 'Choose your table set-up'}
        >
            {!isEmbedded ? (
                <button
                    type='button'
                    className='lobby-preview-overlay__backdrop'
                    onClick={onClose}
                    aria-label='Close table setup'
                />
            ) : null}

            <section className='lobby-preview-overlay__panel'>
                <div className='lobby-preview-overlay__fx-orb lobby-preview-overlay__fx-orb--a' />
                <div className='lobby-preview-overlay__fx-orb lobby-preview-overlay__fx-orb--b' />
                <div className='lobby-preview-overlay__fx-orb lobby-preview-overlay__fx-orb--c' />

                <header className='lobby-preview-overlay__header'>
                    <div>
                        <div className='lobby-preview-overlay__eyebrow'>Live Lobby</div>
                        <h2>Choose Your Table Set-Up</h2>
                        <p>The list below shows the tables available for you to play and how many players are currently seated.</p>
                    </div>

                    <div className='lobby-preview-overlay__header-actions'>
                        {oPrimaryTable ? (
                            <button
                                type='button'
                                className='lobby-preview-overlay__quick-join'
                                onClick={() => onJoinTable(oPrimaryTable._id)}
                                disabled={isJoining}
                            >
                                {isJoining ? 'Joining...' : 'Take A Seat'}
                            </button>
                        ) : null}

                        {bShowCloseButton ? (
                            <button type='button' className='lobby-preview-overlay__close' onClick={onClose}>
                                Close
                            </button>
                        ) : null}
                    </div>
                </header>

                <section className='lobby-preview-overlay__controls' aria-label='Table setup controls'>
                    <article className='lobby-preview-overlay__control-card'>
                        <div className='lobby-preview-overlay__control-top'>
                            <div className='lobby-preview-overlay__control-label'>Number of Players</div>
                            <div className='lobby-preview-overlay__control-value'>{nActiveSeatCount} Players</div>
                        </div>

                        <input
                            type='range'
                            min='0'
                            max={PLAYER_OPTIONS.length - 1}
                            step='1'
                            value={nSeatSliderIndex}
                            className='lobby-preview-overlay__control-range'
                            onChange={(event) => handleSeatCountChange(event.target.value)}
                            aria-label='Choose number of players'
                            aria-valuetext={`${nActiveSeatCount} players`}
                        />

                        <div className='lobby-preview-overlay__control-stops'>
                            {PLAYER_OPTIONS.map((nSeatOption) => (
                                <button
                                    key={nSeatOption}
                                    type='button'
                                    className={`lobby-preview-overlay__control-stop ${nSeatOption === nActiveSeatCount ? 'is-active' : ''}`}
                                    onClick={() => handleSeatCountChange(PLAYER_OPTIONS.indexOf(nSeatOption))}
                                >
                                    {nSeatOption}
                                </button>
                            ))}
                        </div>
                    </article>

                    <article className='lobby-preview-overlay__control-card'>
                        <div className='lobby-preview-overlay__control-top'>
                            <div className='lobby-preview-overlay__control-label'>Buy-In</div>
                            <div className='lobby-preview-overlay__control-value'>{formatAmount(nActiveBuyIn)}</div>
                        </div>

                        <input
                            type='range'
                            min='0'
                            max={BUY_IN_OPTIONS.length - 1}
                            step='1'
                            value={nBuyInSliderIndex}
                            className='lobby-preview-overlay__control-range'
                            onChange={(event) => handleBuyInChange(event.target.value)}
                            aria-label='Choose buy-in amount'
                            aria-valuetext={`${formatAmount(nActiveBuyIn)} buy-in`}
                        />

                        <div className='lobby-preview-overlay__control-stops'>
                            {BUY_IN_OPTIONS.map((nBuyInOption) => (
                                <button
                                    key={nBuyInOption}
                                    type='button'
                                    className={`lobby-preview-overlay__control-stop ${nBuyInOption === nActiveBuyIn ? 'is-active' : ''}`}
                                    onClick={() => handleBuyInChange(BUY_IN_OPTIONS.indexOf(nBuyInOption))}
                                >
                                    {formatAmount(nBuyInOption)}
                                </button>
                            ))}
                        </div>

                        <p className='lobby-preview-overlay__control-hint'>Blinds adjust automatically based on the table rules for this buy-in.</p>
                    </article>
                </section>

                <div className='lobby-preview-overlay__content'>
                    <div className='lobby-preview-overlay__list-header'>
                        <div>
                            <h3>Available Tables</h3>
                            <p>{nActiveSeatCount} players | Buy-In {formatAmount(nActiveBuyIn)}</p>
                        </div>
                        <span>{aFilteredTables.length} table(s)</span>
                    </div>

                    {isLoading ? (
                        <div className='lobby-preview-overlay__loading'>
                            <div className='lobby-preview-overlay__loading-ring' />
                            <p>Syncing live tables...</p>
                        </div>
                    ) : aFilteredTables.length ? (
                        <div className='lobby-preview-overlay__table-list'>
                            {aFilteredTables.map((table, index) => {
                                const bRapid = !!(Number(table.nRapidPlay) || table.nRapidPlay === true);
                                const bMultiDeck = !!(Number(table.nMultiDeck) || table.nMultiDeck === true);
                                const nActivePlayers = Number(table.nActivePlayers) || 0;
                                const nLiveTableCount = Number(table.nLiveTableCount) || 0;

                                return (
                                    <article
                                        key={table._id || `${table.sName}-${index}`}
                                        className='lobby-preview-overlay__table-row'
                                        style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
                                    >
                                        <div className='lobby-preview-overlay__table-row-main'>
                                            <div className='lobby-preview-overlay__table-row-copy'>
                                                <div className='lobby-preview-overlay__table-row-title'>{table.sName}</div>
                                                <div className='lobby-preview-overlay__table-row-subtitle'>
                                                    Blinds {getBlindLabel(table.nMinBet)}
                                                </div>
                                            </div>

                                            <div className='lobby-preview-overlay__table-row-meta'>
                                                <span className='lobby-preview-overlay__table-pill'>
                                                    {nActivePlayers}/{table.nMaxPlayer} seated
                                                </span>
                                                <span className='lobby-preview-overlay__table-pill'>
                                                    Buy-In {formatAmount(table.nMinBuyIn)}
                                                </span>
                                                {nLiveTableCount ? (
                                                    <span className='lobby-preview-overlay__table-pill'>
                                                        {nLiveTableCount} live {nLiveTableCount === 1 ? 'table' : 'tables'}
                                                    </span>
                                                ) : null}
                                                {bRapid ? <span className='lobby-preview-overlay__table-pill is-hot'>Rapid</span> : null}
                                                {bMultiDeck ? <span className='lobby-preview-overlay__table-pill is-hot'>Multi Deck</span> : null}
                                            </div>
                                        </div>

                                        <button
                                            type='button'
                                            className='lobby-preview-overlay__join'
                                            onClick={() => onJoinTable(table._id)}
                                            disabled={isJoining}
                                        >
                                            {isJoining ? 'Joining...' : 'Take A Seat'}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className='lobby-preview-overlay__empty'>
                            No tables match this setup yet. Try another player count or buy-in.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

LobbyPreviewOverlay.propTypes = {
    isOpen: PropTypes.bool,
    isEmbedded: PropTypes.bool,
    onClose: PropTypes.func,
    tables: PropTypes.arrayOf(
        PropTypes.shape({
            _id: PropTypes.string,
            sName: PropTypes.string,
            nMinBuyIn: PropTypes.number,
            nMinBet: PropTypes.number,
            nMaxPlayer: PropTypes.number,
            nActivePlayers: PropTypes.number,
            nLiveTableCount: PropTypes.number,
            nRapidPlay: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
            nMultiDeck: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
        })
    ),
    onJoinTable: PropTypes.func.isRequired,
    isJoining: PropTypes.bool,
    isLoading: PropTypes.bool,
};

LobbyPreviewOverlay.defaultProps = {
    isOpen: false,
    isEmbedded: false,
    onClose: null,
    tables: [],
    isJoining: false,
    isLoading: false,
};

export default LobbyPreviewOverlay;
