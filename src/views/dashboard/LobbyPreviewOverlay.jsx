import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'scripts/helper';

const PREFERRED_SEAT_COUNTS = [4, 6, 9];

function formatAmount(amount) {
    const nAmount = Number(amount) || 0;
    return _.formatCurrencyWithComa(nAmount);
}

function getBlindLabel(nMinBet) {
    const nSmallBlind = Number(nMinBet) || 0;
    const nBigBlind = nSmallBlind * 2;
    return `${formatAmount(nSmallBlind)}/${formatAmount(nBigBlind)}`;
}

function groupTablesByBuyIn(tables, seatCount) {
    const oGrouped = {};

    tables
        .filter(table => Number(table.nMaxPlayer) === Number(seatCount))
        .forEach(table => {
            const nBuyIn = Number(table.nMinBuyIn) || 0;
            if (!oGrouped[nBuyIn]) oGrouped[nBuyIn] = [];
            oGrouped[nBuyIn].push(table);
        });

    return Object.entries(oGrouped)
        .map(([nBuyIn, aTables]) => ({
            nBuyIn: Number(nBuyIn),
            aTables: [...aTables].sort((a, b) => {
                const nMinBetDiff = Number(a.nMinBet || 0) - Number(b.nMinBet || 0);
                if (nMinBetDiff !== 0) return nMinBetDiff;
                return String(a.sName || '').localeCompare(String(b.sName || ''));
            }),
        }))
        .sort((a, b) => a.nBuyIn - b.nBuyIn);
}

function LobbyPreviewOverlay({ isOpen, isEmbedded, onClose, tables, onJoinTable, isJoining, isLoading }) {
    const aSeatCounts = useMemo(() => {
        const oSeatCountSet = new Set(
            (tables || [])
                .map(table => Number(table.nMaxPlayer))
                .filter(nSeats => Number.isFinite(nSeats) && nSeats > 0)
        );
        const aExtra = [...oSeatCountSet]
            .filter(nSeats => !PREFERRED_SEAT_COUNTS.includes(nSeats))
            .sort((a, b) => a - b);

        return [...PREFERRED_SEAT_COUNTS, ...aExtra];
    }, [tables]);

    const [nActiveSeatCount, setNActiveSeatCount] = useState(PREFERRED_SEAT_COUNTS[0]);
    const [nActiveBuyIn, setNActiveBuyIn] = useState(null);
    const [oFocusedTable, setOFocusedTable] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        if (!aSeatCounts.includes(nActiveSeatCount)) setNActiveSeatCount(aSeatCounts[0]);
    }, [isOpen, aSeatCounts, nActiveSeatCount]);

    const aBuyInRows = useMemo(
        () => groupTablesByBuyIn(tables || [], nActiveSeatCount),
        [tables, nActiveSeatCount]
    );

    const aBuyInOptions = useMemo(() => aBuyInRows.map(({ nBuyIn, aTables }) => ({
        nBuyIn,
        nTableCount: aTables.length,
    })), [aBuyInRows]);

    useEffect(() => {
        if (!isOpen) return;

        if (!aBuyInOptions.length) {
            if (nActiveBuyIn !== null) setNActiveBuyIn(null);
            return;
        }

        const bHasActiveBuyIn = aBuyInOptions.some(({ nBuyIn }) => nBuyIn === nActiveBuyIn);
        if (!bHasActiveBuyIn) setNActiveBuyIn(aBuyInOptions[0].nBuyIn);
    }, [isOpen, aBuyInOptions, nActiveBuyIn]);

    useEffect(() => {
        if (!oFocusedTable) return;
        const bTableStillPresent = (tables || []).some(table => String(table._id) === String(oFocusedTable._id));
        if (!bTableStillPresent) setOFocusedTable(null);
    }, [tables, oFocusedTable]);

    const oActiveBuyInRow = useMemo(
        () => aBuyInRows.find(({ nBuyIn }) => nBuyIn === nActiveBuyIn) || null,
        [aBuyInRows, nActiveBuyIn]
    );

    const nTotalTables = (tables || []).length;
    const nActiveSeatPoolSize = aBuyInRows.reduce((nTotal, row) => nTotal + row.aTables.length, 0);
    const nBlindTierCount = aBuyInRows.length;
    const oQuickJoinTable = oActiveBuyInRow?.aTables?.[0] || null;

    const bShowCloseButton = !isEmbedded && typeof onClose === 'function';
    if (!isOpen) return null;

    return (
        <div
            className={`lobby-preview-overlay ${isEmbedded ? 'lobby-preview-overlay--embedded' : ''}`}
            role={isEmbedded ? undefined : 'dialog'}
            aria-modal={isEmbedded ? undefined : 'true'}
            aria-label={isEmbedded ? undefined : 'Lobby redesign preview'}
        >
            {!isEmbedded ? (
                <button
                    type='button'
                    className='lobby-preview-overlay__backdrop'
                    onClick={onClose}
                    aria-label='Close lobby preview'
                />
            ) : null}

            <section className='lobby-preview-overlay__panel'>
                <div className='lobby-preview-overlay__fx-orb lobby-preview-overlay__fx-orb--a' />
                <div className='lobby-preview-overlay__fx-orb lobby-preview-overlay__fx-orb--b' />
                <div className='lobby-preview-overlay__fx-orb lobby-preview-overlay__fx-orb--c' />

                <header className='lobby-preview-overlay__header'>
                    <div>
                        <div className='lobby-preview-overlay__eyebrow'>Live Lobby Experience</div>
                        <h2>Choose Your Arena</h2>
                        <p>Seat tabs, buy-in tiers, and fast table entry with richer visual feedback.</p>
                        <div className='lobby-preview-overlay__stats'>
                            <span>Live Tables: {nTotalTables}</span>
                            <span>{nActiveSeatCount}-Seat Pool: {nActiveSeatPoolSize}</span>
                            <span>Blind Tiers: {nBlindTierCount}</span>
                        </div>
                    </div>

                    <div className='lobby-preview-overlay__header-actions'>
                        {oQuickJoinTable ? (
                            <button
                                type='button'
                                className='lobby-preview-overlay__quick-join'
                                onClick={() => onJoinTable(oQuickJoinTable._id)}
                                disabled={isJoining}
                            >
                                {isJoining ? 'Joining...' : 'Quick Join'}
                            </button>
                        ) : null}

                        {bShowCloseButton ? (
                            <button type='button' className='lobby-preview-overlay__close' onClick={onClose}>
                                Close
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className='lobby-preview-overlay__tabs'>
                    {aSeatCounts.map(nSeatCount => (
                        <button
                            key={nSeatCount}
                            type='button'
                            className={nSeatCount === nActiveSeatCount ? 'is-active' : ''}
                            onClick={() => setNActiveSeatCount(nSeatCount)}
                        >
                            {nSeatCount} Players
                        </button>
                    ))}
                </div>

                <div className='lobby-preview-overlay__subtabs'>
                    {aBuyInOptions.length > 0 ? (
                        aBuyInOptions.map(({ nBuyIn, nTableCount }) => (
                            <button
                                key={`${nActiveSeatCount}-${nBuyIn}`}
                                type='button'
                                className={nBuyIn === nActiveBuyIn ? 'is-active' : ''}
                                onClick={() => setNActiveBuyIn(nBuyIn)}
                            >
                                {formatAmount(nBuyIn)} ({nTableCount})
                            </button>
                        ))
                    ) : (
                        <span>No table amounts available</span>
                    )}
                </div>

                <div className='lobby-preview-overlay__content'>
                    {isLoading ? (
                        <div className='lobby-preview-overlay__loading'>
                            <div className='lobby-preview-overlay__loading-ring' />
                            <p>Syncing live tables...</p>
                        </div>
                    ) : oActiveBuyInRow ? (
                        <section key={`${nActiveSeatCount}-${oActiveBuyInRow.nBuyIn}`} className='lobby-preview-overlay__buyin-row'>
                            <div className='lobby-preview-overlay__buyin-row-header'>
                                <h3>{nActiveSeatCount}-Player Arena | Buy-In {formatAmount(oActiveBuyInRow.nBuyIn)}</h3>
                                <span>{oActiveBuyInRow.aTables.length} table(s) live</span>
                            </div>

                            <div className='lobby-preview-overlay__table-grid'>
                                {oActiveBuyInRow.aTables.map((table, index) => {
                                    const bRapid = !!(Number(table.nRapidPlay) || table.nRapidPlay === true);
                                    const bMultiDeck = !!(Number(table.nMultiDeck) || table.nMultiDeck === true);
                                    return (
                                        <article
                                            key={table._id || `${table.sName}-${index}`}
                                            className='lobby-preview-overlay__table-card'
                                            style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
                                        >
                                            <div className='lobby-preview-overlay__table-glow' />
                                            <div className='lobby-preview-overlay__table-head'>
                                                <div className='lobby-preview-overlay__table-name'>{table.sName}</div>
                                                <div className='lobby-preview-overlay__table-seats'>{table.nMaxPlayer} Seats</div>
                                            </div>

                                            <div className='lobby-preview-overlay__table-meta'>
                                                <span>Blinds {getBlindLabel(table.nMinBet)}</span>
                                                <span>Buy-In {formatAmount(table.nMinBuyIn)}</span>
                                                {bRapid ? <span className='is-hot'>Rapid</span> : null}
                                                {bMultiDeck ? <span className='is-hot'>Multi Deck</span> : null}
                                            </div>

                                            <div className='lobby-preview-overlay__table-actions'>
                                                <button
                                                    type='button'
                                                    className='lobby-preview-overlay__inspect'
                                                    onClick={() => setOFocusedTable(table)}
                                                >
                                                    Details
                                                </button>
                                                <button
                                                    type='button'
                                                    className='lobby-preview-overlay__join'
                                                    onClick={() => onJoinTable(table._id)}
                                                    disabled={isJoining}
                                                >
                                                    {isJoining ? 'Joining...' : 'Play Table'}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    ) : (
                        <div className='lobby-preview-overlay__empty'>
                            No {nActiveSeatCount}-player tables found. Create table prototypes in admin and they will appear here automatically.
                        </div>
                    )}
                </div>

                {oFocusedTable ? (
                    <div className='lobby-preview-overlay__modal-layer' role='dialog' aria-modal='true' aria-label='Table details'>
                        <button
                            type='button'
                            className='lobby-preview-overlay__modal-backdrop'
                            onClick={() => setOFocusedTable(null)}
                            aria-label='Close table details'
                        />
                        <section className='lobby-preview-overlay__modal'>
                            <button
                                type='button'
                                className='lobby-preview-overlay__modal-close'
                                onClick={() => setOFocusedTable(null)}
                            >
                                Close
                            </button>
                            <div className='lobby-preview-overlay__modal-eyebrow'>Table Intel</div>
                            <h4>{oFocusedTable.sName}</h4>

                            <div className='lobby-preview-overlay__modal-grid'>
                                <div>
                                    <span>Buy-In</span>
                                    <strong>{formatAmount(oFocusedTable.nMinBuyIn)}</strong>
                                </div>
                                <div>
                                    <span>Blinds</span>
                                    <strong>{getBlindLabel(oFocusedTable.nMinBet)}</strong>
                                </div>
                                <div>
                                    <span>Seats</span>
                                    <strong>{oFocusedTable.nMaxPlayer} Players</strong>
                                </div>
                                <div>
                                    <span>Mode</span>
                                    <strong>{oFocusedTable.nRapidPlay ? 'Rapid' : 'Standard'}</strong>
                                </div>
                            </div>

                            <div className='lobby-preview-overlay__modal-actions'>
                                <button type='button' className='secondary' onClick={() => setOFocusedTable(null)}>
                                    Back
                                </button>
                                <button
                                    type='button'
                                    className='primary'
                                    onClick={() => {
                                        setOFocusedTable(null);
                                        onJoinTable(oFocusedTable._id);
                                    }}
                                    disabled={isJoining}
                                >
                                    {isJoining ? 'Joining...' : 'Join This Table'}
                                </button>
                            </div>
                        </section>
                    </div>
                ) : null}
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
